import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Katalog filtrlari (src/server/lawyers.ts → parseFilters). Boshqa parametrlar (utm_* va h.k.) statik sahifani buzmaydi.
const FILTER_KEYS = ["viloyat", "tuman", "yonalish", "tajriba", "reyting", "til", "q", "sort", "sahifa"];
// uz-Cyrl "uz" dan oldin tekshirilishi kerak
const CATALOG = /^\/(?:(uz-Cyrl|ru|uz)\/)?(advokatlar(?:\/.*)?)$/;

/**
 * Filtrsiz katalog sahifalari statik (ISR) — tez. Filtrli soʻrov esa ichki dinamik marshrutga
 * (/[locale]/qidiruv/advokatlar/...) rewrite qilinadi; foydalanuvchi uchun manzil oʻzgarmaydi.
 */
export default function middleware(req: NextRequest) {
  const res = intl(req);
  // next-intl yoʻnaltirayotgan boʻlsa (masalan /uz/... → /...) — aralashmaymiz
  if (res.headers.has("location")) return res;

  const { pathname, searchParams } = req.nextUrl;
  const m = CATALOG.exec(pathname);
  if (!m || !FILTER_KEYS.some((k) => searchParams.get(k))) return res;

  const locale = m[1] ?? routing.defaultLocale;
  const target = req.nextUrl.clone();
  target.pathname = `/${locale}/qidiruv/${m[2]}`;
  const out = NextResponse.rewrite(target);
  // next-intl qoʻygan sarlavha va cookie'lar saqlanadi (til cookie'si, hreflang Link, soʻrov sarlavhalari)
  res.headers.forEach((value, key) => {
    if (key !== "x-middleware-rewrite" && key !== "x-middleware-next" && key !== "set-cookie") out.headers.set(key, value);
  });
  for (const c of res.cookies.getAll()) out.cookies.set(c);
  return out;
}

export const config = {
  // api, _next, _vercel, OG rasm va nuqtali (statik) fayllardan tashqari barcha yoʻllar
  // (OG rasm /uz/opengraph-image manzilida — yoʻnaltirishsiz berilishi kerak)
  matcher: ["/((?!api|_next|_vercel|.*opengraph-image|.*\\..*).*)"],
};
