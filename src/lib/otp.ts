import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { sendSms, smsMockMode } from "./sms";
import { botT } from "./bot-i18n";

const TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

const secret = () => process.env.AUTH_SECRET || "dev-secret";
const hash = (phone: string, code: string) => createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");

export type SendOtpResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: "TOO_SOON" | "TOO_MANY" | "SMS_FAILED"; retryAfterSec?: number };

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const now = Date.now();
  const last = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && now - last.createdAt.getTime() < 60_000) {
    return { ok: false, error: "TOO_SOON", retryAfterSec: Math.ceil((60_000 - (now - last.createdAt.getTime())) / 1000) };
  }
  const hourCount = await prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(now - 3600_000) } } });
  if (hourCount >= 5) return { ok: false, error: "TOO_MANY", retryAfterSec: 3600 };

  const code = String(randomInt(100000, 1000000));
  await prisma.otpCode.create({ data: { phone, codeHash: hash(phone, code), expiresAt: new Date(now + TTL_MS) } });
  try {
    await sendSms(phone, botT("uz").plain("smsOtp", { code }));
  } catch (e) {
    console.error(e);
    return { ok: false, error: "SMS_FAILED" };
  }
  // Mock rejimda kodni javobda qaytarish faqat ishlab chiqish uchun (OTP_DEV_ECHO=1 yoki dev)
  const echo = smsMockMode() && (process.env.NODE_ENV !== "production" || process.env.OTP_DEV_ECHO === "1");
  return { ok: true, ...(echo && { devCode: code }) };
}

/** Kodni tekshiradi va muvaffaqiyatli boʻlsa “ishlatilgan” deb belgilaydi */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
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
  return res.count === 1;
}
