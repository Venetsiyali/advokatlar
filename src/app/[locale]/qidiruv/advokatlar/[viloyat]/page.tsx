import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CatalogRegion, regionMetadata, type SP } from "@/components/lawyers/catalog-routes";

// Ichki marshrut: /advokatlar/[viloyat]?filtrlar (middleware orqali)
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; viloyat: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, viloyat } = await params;
  return regionMetadata(locale, viloyat, true);
}

export default async function FilteredRegionPage({ params, searchParams }: Props) {
  const { locale, viloyat } = await params;
  setRequestLocale(locale);
  return <CatalogRegion locale={locale} slug={viloyat} sp={await searchParams} />;
}
