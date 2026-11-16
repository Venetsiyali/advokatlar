import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { site } from "@/lib/site";
import { BOT_COMMANDS } from "../../../../../bot/src/bot";
import { getBot, webhookPath } from "@/server/telegram-bot";

// Webhook'ni bir marta oʻrnatish (deploy'dan keyin):
//   curl -X POST -H "Authorization: Bearer $TELEGRAM_WEBHOOK_SECRET" https://DOMEN/api/telegram/setup
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bot = getBot();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!bot || !secret) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET kerak" }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = `${site.url}${webhookPath}`;
  await bot.api.setWebhook(url, { secret_token: secret, allowed_updates: ["message", "callback_query"] });
  await bot.api.setMyCommands(BOT_COMMANDS);
  const info = await bot.api.getWebhookInfo();
  return NextResponse.json({ ok: true, url: info.url, pending: info.pending_update_count, lastError: info.last_error_message ?? null });
}
