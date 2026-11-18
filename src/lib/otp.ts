import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { sendSms, smsMockMode } from "./sms";
import { sendTelegram, telegramMockMode } from "./telegram";
import { botT } from "./bot-i18n";
import { TG_PROOF_PREFIX, consumeTelegramProof } from "./tg-verify";

const TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

const secret = () => process.env.AUTH_SECRET || "dev-secret";
const hash = (phone: string, code: string) => createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");

export type SendOtpResult =
  | { ok: true; channel: "sms" | "telegram"; devCode?: string }
  | { ok: false; error: "TOO_SOON" | "TOO_MANY" | "SMS_FAILED" | "SMS_UNAVAILABLE"; retryAfterSec?: number };

/** Mock rejimda kodni javobda qaytarish — faqat ishlab chiqish va e2e testlar uchun */
const devEcho = () => smsMockMode() && (process.env.NODE_ENV !== "production" || process.env.OTP_DEV_ECHO === "1");

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const now = Date.now();
  const last = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && now - last.createdAt.getTime() < 60_000) {
    return { ok: false, error: "TOO_SOON", retryAfterSec: Math.ceil((60_000 - (now - last.createdAt.getTime())) / 1000) };
  }
  const hourCount = await prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(now - 3600_000) } } });
  if (hourCount >= 5) return { ok: false, error: "TOO_MANY", retryAfterSec: 3600 };

  // Raqam Telegram'ga bogʻlangan boʻlsa (bot orqali kontakt yuborgan yoki Telegram bilan kirgan) — kod
  // Telegram'ga ham yuboriladi: bepul va tez. SMS shlyuzi ulanmagan boʻlsa — yagona kanal shu.
  const user = await prisma.user.findUnique({ where: { phone }, select: { telegramId: true, locale: true } });
  const tgChat = !telegramMockMode() ? user?.telegramId : null;
  if (smsMockMode() && !tgChat && !devEcho()) return { ok: false, error: "SMS_UNAVAILABLE" };

  const code = String(randomInt(100000, 1000000));
  await prisma.otpCode.create({ data: { phone, codeHash: hash(phone, code), expiresAt: new Date(now + TTL_MS) } });
  const viaTelegram = tgChat ? (await sendTelegram(tgChat, botT(user?.locale).plain("smsOtp", { code }))) !== null : false;
  // Telegram yetkazilmadi, SMS esa mock — kod hech kimga bormaydi
  if (!viaTelegram && smsMockMode() && !devEcho()) return { ok: false, error: "SMS_UNAVAILABLE" };
  if (!smsMockMode() || !viaTelegram) {
    try {
      await sendSms(phone, botT("uz").plain("smsOtp", { code }));
    } catch (e) {
      console.error(e);
      if (!viaTelegram) return { ok: false, error: "SMS_FAILED" };
    }
  }
  return { ok: true, channel: viaTelegram ? "telegram" : "sms", ...(devEcho() && { devCode: code }) };
}

/**
 * Telefon tasdigʻini tekshiradi va bir martalik ishlatadi: 6 xonali SMS/Telegram kodi yoki
 * Telegram bot orqali tasdiqlash isboti ("tg:<token>"). Muvaffaqiyatda obyekt (Telegram isbotida — telegramId).
 */
export async function verifyOtp(phone: string, code: string): Promise<false | { telegramId?: string }> {
  if (code.startsWith(TG_PROOF_PREFIX)) return (await consumeTelegramProof(phone, code)) ?? false;
  if (!/^\d{6}$/.test(code)) return false;
  const rec = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec || rec.attempts >= MAX_ATTEMPTS) return false;
  const a = Buffer.from(rec.codeHash, "hex");
  const b = Buffer.from(hash(phone, code), "hex");
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    await prisma.otpCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  // Poyga holatidan himoya: faqat bitta soʻrov kodni “ishlatishi” mumkin
  const res = await prisma.otpCode.updateMany({ where: { id: rec.id, usedAt: null }, data: { usedAt: new Date() } });
  return res.count === 1 ? {} : false;
}
