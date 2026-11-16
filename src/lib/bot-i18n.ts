// Telegram bot, SMS va bildirishnomalar uchun tarjimon (React'siz, sayt bilan bir xil messages/*.json).
import { createTranslator } from "use-intl/core";
import uz from "../../messages/uz.json";
import uzCyrl from "../../messages/uz-Cyrl.json";
import ru from "../../messages/ru.json";
import { site } from "./site";

export type AppLocale = "uz" | "uz-Cyrl" | "ru";
export type DbLocale = "uz" | "uz_Cyrl" | "ru";

const MESSAGES = { uz, "uz-Cyrl": uzCyrl, ru } as const;

export const fromDbLocale = (l: DbLocale | string | null | undefined): AppLocale =>
  l === "uz_Cyrl" || l === "uz-Cyrl" ? "uz-Cyrl" : l === "ru" ? "ru" : "uz";
export const toDbLocale = (l: AppLocale): DbLocale => (l === "uz-Cyrl" ? "uz_Cyrl" : l);

/** Telegram tilidan taxminiy tanlov */
export const guessLocale = (languageCode?: string): AppLocale => (languageCode?.startsWith("ru") ? "ru" : "uz");

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Vars = Record<string, string | number>;

/**
 * bot.* kalitlari uchun tarjimon. Qiymatlar HTML-ekranlanadi (Telegram parse_mode=HTML),
 * <b>, <i>, <link> teglari xabardagi formatga aylantiriladi.
 */
export function botT(locale: AppLocale | DbLocale | string | null | undefined) {
  const loc = fromDbLocale(locale);
  const t = createTranslator({ locale: loc, messages: MESSAGES[loc], namespace: "bot" });
  const ts = createTranslator({ locale: loc, messages: MESSAGES[loc], namespace: "status" });
  const fn = (key: string, vars: Vars = {}) => {
    const safe: Vars = { brand: escapeHtml(site.brand) };
    for (const [k, v] of Object.entries(vars)) safe[k] = typeof v === "string" ? escapeHtml(v) : v;
    return t.markup(key as "welcome", {
      ...safe,
      b: (c) => `<b>${c}</b>`,
      i: (c) => `<i>${c}</i>`,
      link: (c) => `<a href="${escapeHtml(String(vars.url ?? site.url))}">${c}</a>`,
    });
  };
  /** SMS uchun — HTML'siz oddiy matn */
  fn.plain = (key: string, vars: Vars = {}) =>
    t.markup(key as "welcome", { brand: site.brand, ...vars, b: (c) => c, i: (c) => c, link: (c) => c });
  fn.status = (s: string) => (ts.has(s as "YANGI") ? ts(s as "YANGI") : s);
  fn.locale = loc;
  return fn;
}

export type BotT = ReturnType<typeof botT>;

/** DB'dagi uch tilli nom */
export function dbName(item: { nameUz: string; nameUzCyrl: string; nameRu: string } | null | undefined, locale: AppLocale) {
  if (!item) return "";
  return locale === "ru" ? item.nameRu : locale === "uz-Cyrl" ? item.nameUzCyrl : item.nameUz;
}
