import "server-only";
import { prisma } from "@/lib/db";
import { botT, dbName } from "@/lib/bot-i18n";
import { site } from "@/lib/site";
import { sendSms } from "@/lib/sms";
import { editTelegram, sendTelegram } from "@/lib/telegram";
import { acceptedCard, newRequestCard, type RequestCardData } from "./telegram-ui";

// Bildirishnomalar markazi. Sayt kabinetidagi bildirishnoma = RequestAssignment yozuvining oʻzi;
// bu yerda tashqi kanallar (Telegram, SMS) boshqariladi. Xatolar asosiy oqimni toʻxtatmaydi.

const safe = async (label: string, fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (e) {
    console.error(label, e);
  }
};

export async function notifyLawyerNewRequest(assignmentId: string, lawyerUserId: string, req: RequestCardData) {
  await safe("notifyLawyerNewRequest", async () => {
    const user = await prisma.user.findUnique({ where: { id: lawyerUserId }, select: { telegramId: true, locale: true } });
    if (!user?.telegramId) return;
    const { text, buttons } = newRequestCard(req, assignmentId, botT(user.locale).locale);
    const msg = await sendTelegram(user.telegramId, text, buttons);
    if (msg?.message_id) {
      await prisma.requestAssignment.update({ where: { id: assignmentId }, data: { tgMessageId: msg.message_id } });
    }
  });
}

/** Murojaat boshqa advokat tomonidan band qilinganda qolganlarning Telegram xabarlarini yangilash */
export async function notifyAssignmentsTaken(requestId: string, exceptLawyerId: string) {
  await safe("notifyAssignmentsTaken", async () => {
    const rows = await prisma.requestAssignment.findMany({
      where: { requestId, lawyerId: { not: exceptLawyerId }, tgMessageId: { not: null } },
      include: { lawyer: { include: { user: { select: { telegramId: true, locale: true } } } }, request: { select: { code: true } } },
    });
    await Promise.all(
      rows.map((a) =>
        a.lawyer.user.telegramId && a.tgMessageId
          ? editTelegram(a.lawyer.user.telegramId, a.tgMessageId, botT(a.lawyer.user.locale)("taken", { code: a.request.code }))
          : null,
      ),
    );
  });
}

export async function notifyClientAccepted(requestId: string, lawyerName: string) {
  await safe("notifyClientAccepted", async () => {
    const req = await prisma.request.findUniqueOrThrow({ where: { id: requestId }, include: { client: true } });
    const t = botT(req.client?.locale);
    if (req.client?.telegramId) await sendTelegram(req.client.telegramId, t("tgClientAccepted", { code: req.code, name: lawyerName }));
    await sendSms(req.phone, t.plain("smsAccepted", { code: req.code, name: lawyerName }));
  });
}

export async function notifyClientReviewLink(requestId: string) {
  await safe("notifyClientReviewLink", async () => {
    const req = await prisma.request.findUniqueOrThrow({ where: { id: requestId }, include: { client: true } });
    if (!req.reviewToken) return;
    const t = botT(req.client?.locale);
    const url = `${site.url}/baho/${req.reviewToken}`;
    await sendSms(req.phone, t.plain("smsReview", { code: req.code, url }));
    if (req.client?.telegramId) await sendTelegram(req.client.telegramId, t("tgReview", { code: req.code, url }));
  });
}

export async function notifyAdmin(key: "adminNoLawyer" | "adminTimeout", vars: Record<string, string | number>) {
  const t = botT("uz");
  const text = t(key, vars);
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chat) {
    console.warn(`[ADMIN] ${t.plain(key, vars)}`);
    return;
  }
  await safe("notifyAdmin", () => sendTelegram(chat, `⚠️ ${text}`));
}

export async function notifyAdminNoLawyer(req: { code: string; region: { nameUz: string; nameUzCyrl: string; nameRu: string }; specialization: { nameUz: string; nameUzCyrl: string; nameRu: string } }) {
  await notifyAdmin("adminNoLawyer", { code: req.code, region: dbName(req.region, "uz"), spec: dbName(req.specialization, "uz") });
}

/** Advokatga moderatsiya natijasi: tasdiqlandi / rad etildi / bloklandi */
export async function notifyLawyerModeration(lawyerId: string, decision: "approved" | "rejected" | "blocked", reason?: string) {
  await safe("notifyLawyerModeration", async () => {
    const l = await prisma.lawyerProfile.findUniqueOrThrow({ where: { id: lawyerId }, include: { user: true } });
    const t = botT(l.user.locale);
    const key = { approved: "lawyerApproved", rejected: "lawyerRejected", blocked: "lawyerBlocked" }[decision];
    const vars = { reason: reason || "—", url: `${site.url}/kabinet` };
    if (l.user.telegramId) await sendTelegram(l.user.telegramId, t(key, vars));
    if (l.user.phone) await sendSms(l.user.phone, t.plain(key, vars));
  });
}

/** Admin murojaatni advokatga qoʻlda biriktirganda: advokatga kontaktlar bilan karta + SMS */
export async function notifyLawyerAssignedByAdmin(requestId: string) {
  await safe("notifyLawyerAssignedByAdmin", async () => {
    const req = await prisma.request.findUniqueOrThrow({
      where: { id: requestId },
      include: { region: true, district: true, specialization: true, assignedLawyer: { include: { user: true } } },
    });
    const user = req.assignedLawyer?.user;
    if (!user) return;
    const t = botT(user.locale);
    if (user.telegramId) {
      const { text, buttons } = acceptedCard(req, t.locale);
      await sendTelegram(user.telegramId, `${t("adminAssigned", { code: req.code })}\n\n${text}`, buttons);
    }
    if (user.phone) await sendSms(user.phone, t.plain("smsAdminAssigned", { code: req.code, url: `${site.url}/kabinet/murojaatlar` }));
  });
}
