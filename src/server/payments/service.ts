import "server-only";
import type { PaymentProvider, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { botT } from "@/lib/bot-i18n";
import { extendedEnd, revertedEnd } from "@/lib/payments-core";
import { site } from "@/lib/site";
import { sendSms } from "@/lib/sms";
import { sendTelegram } from "@/lib/telegram";
import { formatUzs } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

export const paymeConfig = () => ({
  merchantId: process.env.PAYME_MERCHANT_ID ?? "",
  key: process.env.PAYME_KEY ?? "",
  test: process.env.PAYME_TEST === "1",
});
export const clickConfig = () => ({
  serviceId: process.env.CLICK_SERVICE_ID ?? "",
  merchantId: process.env.CLICK_MERCHANT_ID ?? "",
  secret: process.env.CLICK_SECRET_KEY ?? "",
});

export const providerEnabled = (p: "PAYME" | "CLICK") =>
  p === "PAYME" ? !!(paymeConfig().merchantId && paymeConfig().key) : !!(clickConfig().serviceId && clickConfig().merchantId && clickConfig().secret);

/**
 * Mock toʻlov: provayder kalitlari berilmagan va production emas (yoki PAYMENTS_MOCK=1).
 * Productionda tasodifan bepul obuna olish imkoni qolmasligi uchun.
 */
export const mockAllowed = (p: "PAYME" | "CLICK") =>
  !providerEnabled(p) && (process.env.NODE_ENV !== "production" || process.env.PAYMENTS_MOCK === "1");

/** Faol tarif boʻyicha yangi toʻlov buyurtmasi. Provayderga yetib bormagan eski buyurtmalar bekor qilinadi. */
export async function createPayment(lawyerId: string, provider: PaymentProvider, planSlug = "oylik") {
  const plan = await prisma.plan.findFirst({ where: { slug: planSlug, isActive: true } });
  if (!plan) return null;
  return prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { lawyerId, status: "KUTILMOQDA", externalId: null },
      data: { status: "BEKOR", cancelledAt: new Date() },
    });
    return tx.payment.create({
      data: { lawyerId, planId: plan.id, provider, amountUzs: plan.priceUzs, periodDays: plan.periodDays },
    });
  });
}

/**
 * Toʻlovni “toʻlandi” deb belgilash va obunani uzaytirish — atomik va idempotent:
 * faqat KUTILMOQDA holatidan oʻtganda obuna uzaytiriladi.
 */
export async function markPaid(paymentId: string, extra: Prisma.PaymentUpdateManyMutationInput = {}, now = new Date()) {
  const result = await prisma.$transaction(async (tx: Tx) => {
    const upd = await tx.payment.updateMany({
      where: { id: paymentId, status: "KUTILMOQDA" },
      data: { ...extra, status: "TOLANDI", paidAt: now },
    });
    if (upd.count === 0) return null;
    const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const sub = await tx.subscription.findUnique({ where: { lawyerId: p.lawyerId } });
    const endsAt = extendedEnd(sub, now, p.periodDays);
    await tx.subscription.upsert({
      where: { lawyerId: p.lawyerId },
      update: { status: "FAOL", endsAt, planId: p.planId, remindedAt: null },
      create: { lawyerId: p.lawyerId, status: "FAOL", startsAt: now, endsAt, planId: p.planId },
    });
    return { payment: p, endsAt };
  });
  if (result) await notifyPaymentSuccess(result.payment.lawyerId, result.payment.amountUzs, result.endsAt);
  return result;
}

/** Bajarilgan toʻlov bekor qilinganda (Payme state -2): qoʻshilgan davr qaytarib olinadi */
export async function revertPaid(tx: Tx, paymentId: string, now = new Date()) {
  const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const sub = await tx.subscription.findUnique({ where: { lawyerId: p.lawyerId } });
  if (!sub) return;
  const endsAt = revertedEnd(sub.endsAt, p.periodDays);
  await tx.subscription.update({
    where: { id: sub.id },
    data: { endsAt, status: endsAt > now ? sub.status : "MUDDATI_OTGAN" },
  });
}

async function notifyPaymentSuccess(lawyerId: string, amountUzs: number, endsAt: Date) {
  try {
    const l = await prisma.lawyerProfile.findUnique({ where: { id: lawyerId }, include: { user: true } });
    if (!l) return;
    const t = botT(l.user.locale);
    const date = new Intl.DateTimeFormat(t.locale === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(endsAt);
    const vars = { amount: formatUzs(amountUzs), date, url: `${site.url}/kabinet/obuna` };
    if (l.user.telegramId) await sendTelegram(l.user.telegramId, t("paymentSuccess", vars));
    if (l.user.phone) await sendSms(l.user.phone, t.plain("paymentSuccess", vars));
  } catch (e) {
    console.error("notifyPaymentSuccess", e);
  }
}
