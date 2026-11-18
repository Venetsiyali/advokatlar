import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { telegramVerificationStatus } from "@/lib/tg-verify";

// Brauzer Telegram orqali telefon tasdigʻi holatini soʻrab turadi (har 2 soniyada). Token — faqat shu brauzerda.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ip = await clientIp();
  if (!rateLimit(`tgv:ip:${ip}`, 600, 3600_000).ok) return NextResponse.json({ status: "rate" }, { status: 429 });
  const res = await telegramVerificationStatus(token);
  return NextResponse.json(res, { status: res.status === "invalid" ? 400 : 200, headers: { "Cache-Control": "no-store" } });
}
