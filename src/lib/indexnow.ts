import { routing } from "@/i18n/routing";
import { localeUrl } from "./seo";
import { site } from "./site";

/**
 * IndexNow kaliti — ochiq maʼlumot (maxfiy emas): qidiruv tizimlari uni
 * https://<domen>/<kalit>.txt manzilidan tekshiradi (fayl: public/<kalit>.txt).
 * Kalit oʻzgartirilsa, public'dagi fayl ham qayta nomlanadi.
 */
export const INDEXNOW_KEY = "0888e59c4a495add6073af2071df04bb";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Yuborish faqat production'da va haqiqiy domenda (preview/localhost — yoʻq) */
export function indexNowEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.INDEXNOW_DISABLED === "1") return false;
  if (env.VERCEL_ENV !== "production" && env.INDEXNOW_FORCE !== "1") return false;
  return /^https:\/\/(?!localhost)[^/]+$/.test(site.url) && !site.url.endsWith(".vercel.app");
}

/** Sahifa barcha tillarda (uz — prefikssiz, /uz-Cyrl, /ru) */
export const inAllLocales = (path: string) => routing.locales.map((l) => localeUrl(l, path));

/** Maqola faqat oʻz tilida ochiladi; oʻzbek (lotin) maqola kirill yozuvida ham bor */
export function articleUrls(slug: string, locale: "uz" | "uz_Cyrl" | "ru"): string[] {
  const locales = locale === "ru" ? ["ru"] : locale === "uz_Cyrl" ? ["uz-Cyrl"] : ["uz", "uz-Cyrl"];
  return locales.flatMap((l) => [localeUrl(l, `/maqolalar/${slug}`), localeUrl(l, "/maqolalar")]);
}

/** Advokat profili va u koʻrinadigan katalog sahifalari */
export function lawyerUrls(l: { slug: string; region?: { slug: string } | null; specs?: string[] }): string[] {
  return [
    `/advokat/${l.slug}`,
    "/advokatlar",
    ...(l.region ? [`/advokatlar/${l.region.slug}`] : []),
    ...(l.specs ?? []).map((s) => `/advokatlar/yonalish/${s}`),
  ].flatMap(inAllLocales);
}

/** IndexNow soʻrov tanasi: takrorlar olib tashlanadi, faqat oʻz domenimizdagi URL'lar */
export function indexNowPayload(urls: string[]) {
  const host = new URL(site.url).host;
  const urlList = [...new Set(urls)].filter((u) => new URL(u).host === host).slice(0, 10_000);
  return { host, key: INDEXNOW_KEY, keyLocation: `${site.url}/${INDEXNOW_KEY}.txt`, urlList };
}
