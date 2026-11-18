import "server-only";
import { prisma } from "./db";
import { formatPhone, normalizePhone } from "./phone";
import { smsMockMode } from "./sms";
import { telegramMockMode } from "./telegram";

/**
 * Telefon raqamni Telegram orqali tasdiqlash (SMS oʻrniga, bepul).
 *
 * 1. Brauzer tasodifiy token yaratadi va t.me/<bot>?start=v_<token> havolasini ochadi.
 * 2. Bot /start v_<token> → yozuv yaratadi va «Raqamni yuborish» tugmasini koʻrsatadi.
 * 3. Foydalanuvchi oʻz kontaktini yuboradi (Telegram raqam egasini kafolatlaydi) → yozuv tasdiqlanadi.
 * 4. Brauzer holatni soʻrab turadi; tasdiqlangach, "tg:<token>" isbot sifatida kirish/murojaatga yuboriladi
 *    va bir martalik ishlatiladi (consumeTelegramProof).
 */

export const TG_TOKEN_RE = /^[A-Za-z0-9_-]{24,48}$/;
export const TG_PROOF_PREFIX = "tg:";
const START_TTL_MS = 15 * 60_000;
const CONFIRMED_TTL_MS = 15 * 60_000;

/** Qaysi tasdiqlash kanallari ishlaydi (sahifalar formaga uzatadi) */
export function phoneChannels() {
  const devEcho = process.env.NODE_ENV !== "production" || process.env.OTP_DEV_ECHO === "1";
  return {
    sms: !smsMockMode() || devEcho,
    telegram: !telegramMockMode() || process.env.TELEGRAM_VERIFY_FORCE === "1",
  };
}

/** Bot: /start v_<token>. Token boshqa Telegram hisobiga tegishli yoki ishlatilgan boʻlsa — false */
export async function startTelegramVerification(token: string, telegramId: string): Promise<"ok" | "invalid" | "done"> {
  if (!TG_TOKEN_RE.test(token)) return "invalid";
  const existing = await prisma.phoneVerification.findUnique({ where: { id: token } });
  if (existing) {
    if (existing.telegramId !== telegramId || existing.expiresAt < new Date() || existing.usedAt) return "invalid";
    return existing.confirmedAt ? "done" : "ok";
  }
  await prisma.phoneVerification.create({ data: { id: token, telegramId, expiresAt: new Date(Date.now() + START_TTL_MS) } });
  // Eskirgan yozuvlarni vaqti-vaqti bilan tozalash
  if (Math.random() < 0.05) await prisma.phoneVerification.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } } });
  return "ok";
}

/** Bot: foydalanuvchi oʻz kontaktini yubordi */
export async function confirmTelegramVerification(token: string, telegramId: string, rawPhone: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone);
  if (!phone || !TG_TOKEN_RE.test(token)) return false;
  const res = await prisma.phoneVerification.updateMany({
    where: { id: token, telegramId, confirmedAt: null, usedAt: null, expiresAt: { gt: new Date() } },
    data: { phone, confirmedAt: new Date(), expiresAt: new Date(Date.now() + CONFIRMED_TTL_MS) },
  });
  return res.count === 1;
}

/** Brauzer: holatni soʻrash */
export async function telegramVerificationStatus(token: string) {
  if (!TG_TOKEN_RE.test(token)) return { status: "invalid" as const };
  const v = await prisma.phoneVerification.findUnique({ where: { id: token } });
  if (!v) return { status: "pending" as const };
  if (v.usedAt || v.expiresAt < new Date()) return { status: "expired" as const };
  if (v.confirmedAt && v.phone) return { status: "confirmed" as const, phone: formatPhone(v.phone) };
  return { status: "pending" as const };
}

/** Kirish yoki murojaat: "tg:<token>" isbotini bir marta ishlatadi; muvaffaqiyatda Telegram ID qaytadi */
export async function consumeTelegramProof(phone: string, proof: string): Promise<{ telegramId: string } | null> {
  const token = proof.slice(TG_PROOF_PREFIX.length);
  if (!proof.startsWith(TG_PROOF_PREFIX) || !TG_TOKEN_RE.test(token)) return null;
  const v = await prisma.phoneVerification.findUnique({ where: { id: token } });
  if (!v || v.phone !== phone || !v.confirmedAt) return null;
  const res = await prisma.phoneVerification.updateMany({
    where: { id: token, phone, usedAt: null, confirmedAt: { not: null }, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return res.count === 1 ? { telegramId: v.telegramId } : null;
}

/** Telegram hisobini foydalanuvchiga bogʻlash (boshqa hisobda boʻlsa — uziladi) */
export async function linkTelegram(userId: string, telegramId: string) {
  await prisma.$transaction([
    prisma.user.updateMany({ where: { telegramId, id: { not: userId } }, data: { telegramId: null } }),
    prisma.user.update({ where: { id: userId }, data: { telegramId } }),
  ]);
}
