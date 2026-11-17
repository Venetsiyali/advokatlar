import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { localeUrl } from "@/lib/seo";
import { STATIC_SLUGS } from "@/lib/static-pages";

// Har bir sahifa barcha tillarda, hreflang alternativlari bilan. 50 000 URL dan oshsa — generateSitemaps bilan boʻlish kerak.
// Har soʻrovda bazadan generatsiya qilinadi (Docker build vaqtida baza boʻlmaydi)
export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];
type Freq = Entry["changeFrequency"];

function localized(path: string, opts: { lastModified?: Date; changeFrequency?: Freq; priority?: number; locales?: readonly string[] } = {}): Entry[] {
  const locales = opts.locales ?? routing.locales;
  const languages = Object.fromEntries(locales.map((l) => [l, localeUrl(l, path)]));
  return locales.map((l) => ({
    url: localeUrl(l, path),
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Faqat advokati bor viloyat va yoʻnalishlar — boʻsh sahifalar noindex (catalog-routes.tsx)
  const visible = { status: "TASDIQLANGAN", user: { isBlocked: false } } as const;
  const [regions, specs, lawyers, topics, articles] = await Promise.all([
    prisma.region.findMany({ where: { lawyers: { some: visible } }, select: { slug: true } }),
    prisma.specialization.findMany({ where: { lawyers: { some: { lawyer: visible } } }, select: { slug: true } }),
    prisma.lawyerProfile.findMany({
      where: { status: "TASDIQLANGAN", user: { isBlocked: false } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.topicPage.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({ where: { published: true }, select: { slug: true, locale: true, updatedAt: true } }),
  ]);

  return [
    ...localized("/", { changeFrequency: "daily", priority: 1 }),
    ...localized("/advokatlar", { changeFrequency: "daily", priority: 0.9 }),
    ...localized("/mavzu", { changeFrequency: "weekly", priority: 0.8 }),
    ...localized("/reyting", { changeFrequency: "daily", priority: 0.7 }),
    ...localized("/navbatchi-advokat", { changeFrequency: "daily", priority: 0.7 }),
    ...localized("/maqolalar", { changeFrequency: "weekly", priority: 0.6 }),
    ...localized("/narxlar", { changeFrequency: "monthly", priority: 0.5 }),
    ...localized("/murojaat", { changeFrequency: "monthly", priority: 0.6 }),
    ...STATIC_SLUGS.flatMap((s) => localized(`/${s}`, { changeFrequency: "yearly", priority: 0.3 })),
    ...regions.flatMap((r) => localized(`/advokatlar/${r.slug}`, { changeFrequency: "daily", priority: 0.8 })),
    ...specs.flatMap((s) => localized(`/advokatlar/yonalish/${s.slug}`, { changeFrequency: "daily", priority: 0.8 })),
    ...topics.flatMap((t) => localized(`/mavzu/${t.slug}`, { lastModified: t.updatedAt, changeFrequency: "monthly", priority: 0.8 })),
    ...lawyers.flatMap((l) => localized(`/advokat/${l.slug}`, { lastModified: l.updatedAt, changeFrequency: "weekly", priority: 0.7 })),
    // Maqola faqat oʻz tilida (oʻzbekcha lotin maqola kirill yozuvida ham mavjud)
    ...articles.flatMap((a) =>
      localized(`/maqolalar/${a.slug}`, {
        lastModified: a.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
        locales: a.locale === "ru" ? ["ru"] : a.locale === "uz_Cyrl" ? ["uz-Cyrl"] : ["uz", "uz-Cyrl"],
      }),
    ),
  ];
}
