import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/site";

// Shaxsiy va xizmat sahifalari indekslanmaydi. Staging/test serverda ROBOTS_NOINDEX=1 — butun sayt yopiladi.
const PRIVATE = ["/admin", "/kabinet", "/kirish", "/baho", "/api/"];

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deploy'lari ham indekslanmaydi
  if (process.env.ROBOTS_NOINDEX === "1" || process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const prefixes = ["", ...routing.locales.filter((l) => l !== routing.defaultLocale).map((l) => `/${l}`)];
  const disallow = PRIVATE.flatMap((p) => (p.startsWith("/api") ? [p] : prefixes.map((pre) => `${pre}${p}`)));
  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
