import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CatalogSpec, specMetadata, type SP } from "@/components/lawyers/catalog-routes";

// Ichki marshrut: /advokatlar/yonalish/[slug]?filtrlar (middleware orqali)
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  return specMetadata(locale, slug, true);
}

export default async function FilteredSpecPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <CatalogSpec locale={locale} slug={slug} sp={await searchParams} />;
}
