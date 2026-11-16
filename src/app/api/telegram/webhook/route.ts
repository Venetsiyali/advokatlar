import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getBot } from "@/server/telegram-bot";

// Telegram webhook (Vercel). O'rnatish: /api/telegram/setup. Docker'da esa alohida bot servisi ishlatiladi.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(req: Request) {
  const bot = getBot();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!bot || !secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  // Telegram har soʻrovda setWebhook dagi maxfiy tokenni yuboradi
  const given = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  handler ??= webhookCallback(bot, "std/http", { timeoutMilliseconds: 25_000 });
  try {
    return await handler(req);
  } catch (e) {
    console.error("[telegram] webhook xatosi", e);
    // 200 qaytaramiz — aks holda Telegram shu update'ni qayta-qayta yuboradi
    return NextResponse.json({ ok: false });
  }
}
