import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogPageShell } from "@/components/lawyers/catalog-page";
import { parseFilters } from "@/server/lawyers";
import { alternates } from "@/lib/seo";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("catalogTitle"),
    description: t("catalogDescription"),
    alternates: alternates(locale, "/advokatlar"),
    // filtrlangan variantlar indekslanmaydi — kanonik sahifa yetarli
    robots: Object.keys(sp).length > 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("catalog");
  return (
    <CatalogPageShell
      locale={locale}
      path="/advokatlar"
      title={t("title")}
      intro={t("subtitle")}
      crumbs={[{ label: t("title") }]}
      filters={parseFilters(sp)}
      searchParams={sp}
    />
  );
}
