import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { sendOtp } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const Body = z.object({ phone: z.string().max(32), turnstileToken: z.string().max(4096).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ ok: false, error: "BAD_PHONE" }, { status: 400 });

  const ip = await clientIp();
  const ipLimit = rateLimit(`otp:ip:${ip}`, 10, 3600_000);
  if (!ipLimit.ok) return NextResponse.json({ ok: false, error: "TOO_MANY", retryAfterSec: ipLimit.retryAfterSec }, { status: 429 });
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "CAPTCHA" }, { status: 400 });
  }

  const result = await sendOtp(phone);
  return NextResponse.json(result, { status: result.ok ? 200 : result.error === "SMS_FAILED" || result.error === "SMS_UNAVAILABLE" ? 503 : 429 });
}
