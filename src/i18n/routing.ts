import { defineRouting } from "next-intl/routing";

export const locales = ["uz", "uz-Cyrl", "ru"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "uz",
  localePrefix: "as-needed",
  localeDetection: false,
});
