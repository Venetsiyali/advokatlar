import "server-only";
import { createBot } from "../../bot/src/bot";

// Vercel (serverless) uchun: bot alohida jarayon emas, balki /api/telegram/webhook route ichida ishlaydi.
// Instans har bir “issiq” funksiya uchun bir marta yaratiladi; botInfo grammY tomonidan birinchi update'da olinadi.
let bot: ReturnType<typeof createBot> | null = null;

export function getBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  bot ??= createBot(token);
  return bot;
}

export const webhookPath = "/api/telegram/webhook";
