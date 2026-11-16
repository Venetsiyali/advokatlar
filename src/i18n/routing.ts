import { defineRouting } from "next-intl/routing";

export const locales = ["uz", "uz-Cyrl", "ru"] as const;
export type AppLocale = (typeof locales)[number];

/** Tillarning oʻz nomlari (har bir tilda oʻzicha yoziladi — tarjima qilinmaydi) */
export const localeNames: Record<AppLocale, string> = { uz: "Oʻzbekcha", "uz-Cyrl": "Ўзбекча", ru: "Русский" };

export const routing = defineRouting({
  locales,
  defaultLocale: "uz",
  localePrefix: "as-needed",
  localeDetection: false,
});
