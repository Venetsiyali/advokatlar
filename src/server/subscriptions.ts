import "server-only";
import { prisma } from "@/lib/db";
import { botT } from "@/lib/bot-i18n";
import { site } from "@/lib/site";
import { sendSms } from "@/lib/sms";
import { sendTelegram } from "@/lib/telegram";

const DAY = 86400_000;

function fmtDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/**
 * Davriy: muddati tugaganlarni MUDDATI_OTGAN qiladi va xabar beradi;
 * 3 kun qolganlarga (har davr uchun bir marta) eslatma yuboradi.
 */
export async function processSubscriptions(now = new Date()) {
  const url = `${site.url}/kabinet/obuna`;
  const include = { lawyer: { include: { user: { select: { telegramId: true, locale: true, phone: true } } } } } as const;

  // 1) Muddati tugaganlar
  const expired = await prisma.subscription.findMany({
    where: { status: { in: ["SINOV", "FAOL"] }, endsAt: { lte: now } },
    include,
  });
  for (const s of expired) {
    const upd = await prisma.subscription.updateMany({ where: { id: s.id, status: s.status }, data: { status: "MUDDATI_OTGAN" } });
    if (upd.count === 0) continue;
    const u = s.lawyer.user;
    if (u.telegramId) await sendTelegram(u.telegramId, botT(u.locale)("subscriptionExpired", { url }));
  }

  // 2) 3 kun qolganlar — shu davr uchun hali eslatilmagan boʻlsa
  const soon = await prisma.subscription.findMany({
    where: { status: { in: ["SINOV", "FAOL"] }, endsAt: { gt: now, lte: new Date(now.getTime() + 3 * DAY) } },
    include,
  });
  let reminded = 0;
  for (const s of soon) {
    if (s.remindedAt && s.remindedAt.getTime() >= s.endsAt.getTime() - 4 * DAY) continue;
    const u = s.lawyer.user;
    const t = botT(u.locale);
    const date = fmtDate(s.endsAt, t.locale);
    if (u.telegramId) await sendTelegram(u.telegramId, t("subscriptionReminder", { date, url }));
    if (u.phone) await sendSms(u.phone, t.plain("smsSubscription", { date, url })).catch((e) => console.error("sub sms", e));
    await prisma.subscription.update({ where: { id: s.id }, data: { remindedAt: now } });
    reminded++;
  }
  return { expired: expired.length, reminded };
}
