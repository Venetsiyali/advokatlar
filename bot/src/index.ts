// Telegram bot jarayoni. Ishga tushirish: npm run bot  (yoki Docker'dagi "bot" servisi)
//   BOT_MODE=webhook (standart) — HTTP server BOT_PORT da, Telegram webhook'ni qabul qiladi
//   BOT_MODE=polling — lokal ishlab chiqish uchun (ochiq URL kerak emas)
import { createServer } from "node:http";
import { webhookCallback } from "grammy";
import { BOT_COMMANDS, createBot } from "./bot";

async function main() {
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn("[bot] TELEGRAM_BOT_TOKEN berilmagan — bot ishga tushmaydi (mock rejim). Sayt bildirishnomalari konsolga yoziladi.");
  // Konteyner qayta-qayta qayta ishga tushmasligi uchun jarayonni tirik qoldiramiz
  setInterval(() => {}, 1 << 30);
} else {
  const bot = createBot(token);
  const mode = process.argv.includes("--polling") ? "polling" : (process.env.BOT_MODE ?? "webhook");

  await bot.api.setMyCommands(BOT_COMMANDS);

  if (mode === "polling") {
    await bot.api.deleteWebhook();
    console.info("[bot] polling rejimida ishga tushdi");
    void bot.start({ drop_pending_updates: false });
  } else {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET berilishi shart (webhook rejimi)");
    const path = process.env.BOT_WEBHOOK_PATH ?? "/telegram/webhook";
    const handle = webhookCallback(bot, "http", { secretToken: secret, timeoutMilliseconds: 25_000 });
    const port = Number(process.env.BOT_PORT ?? 8081);

    createServer(async (req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200).end("ok");
        return;
      }
      if (req.method === "POST" && req.url === path) {
        try {
          await handle(req, res);
        } catch (e) {
          console.error("[bot] webhook xatosi", e);
          if (!res.headersSent) res.writeHead(500).end();
        }
        return;
      }
      res.writeHead(404).end();
    }).listen(port, () => console.info(`[bot] webhook server :${port}${path}`));

    const publicUrl = process.env.BOT_WEBHOOK_URL;
    if (publicUrl) {
      await bot.api.setWebhook(`${publicUrl.replace(/\/$/, "")}${path}`, {
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
      });
      console.info("[bot] webhook oʻrnatildi:", publicUrl);
    }
  }
}
}

main().catch((e) => {
  console.error("[bot] ishga tushmadi:", e);
  process.exit(1);
});
