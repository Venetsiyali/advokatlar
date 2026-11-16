import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processTimeouts } from "@/server/matching";
import { processSubscriptions } from "@/server/subscriptions";

// Tashqi cron uchun: curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/dispatch
// Vercel Cron GET soʻrovi yuboradi va CRON_SECRET ni xuddi shu sarlavhada oʻzi qoʻshadi.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ requests: await processTimeouts(), subscriptions: await processSubscriptions() });
}
