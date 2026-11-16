import "server-only";

// Telegram Bot API ustida yupqa qatlam. TELEGRAM_BOT_TOKEN boʻlmasa — mock (konsolga yoziladi).
export type InlineButton = { text: string; callback_data?: string; url?: string };

export const telegramMockMode = () => !process.env.TELEGRAM_BOT_TOKEN;

export async function tgCall<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  if (telegramMockMode()) {
    console.info(`[Telegram mock] ${method}`, JSON.stringify(payload).slice(0, 400));
    return null;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) {
      console.error(`[Telegram] ${method} xatosi:`, json.description);
      return null;
    }
    return json.result ?? null;
  } catch (e) {
    console.error("[Telegram] tarmoq xatosi", e);
    return null;
  }
}

export async function sendTelegram(chatId: string, text: string, buttons?: InlineButton[][]) {
  return tgCall<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(buttons && { reply_markup: { inline_keyboard: buttons } }),
  });
}

export async function editTelegram(chatId: string, messageId: number, text: string) {
  return tgCall("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" });
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
