import { routing } from "@/i18n/routing";
import { site } from "./site";

/** Lokalga mos to'liq URL: uz — prefikssiz, boshqalari /ru, /uz-Cyrl */
export function localeUrl(locale: string, path: string) {
  const clean = path === "/" ? "" : path;
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${site.url}${prefix}${clean}` || site.url;
}

export function alternates(locale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl(routing.defaultLocale, path);
  return { canonical: localeUrl(locale, path), languages };
}

/** JSON-LD uchun xavfsiz serializatsiya: "<" belgisi script tegini yopa olmasligi uchun ekranlanadi */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
