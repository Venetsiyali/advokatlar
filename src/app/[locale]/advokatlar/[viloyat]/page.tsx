import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CatalogRegion, regionMetadata } from "@/components/lawyers/catalog-routes";
import { regionParams } from "@/server/static-params";

// Viloyat sahifasi — statik (ISR, birinchi soʻrovda generatsiya), 60 soniyada yangilanadi
export const revalidate = 60;

/** Build vaqtida mavjud yozuvlar oldindan tayyorlanadi; yangilari — birinchi soʻrovda (ISR) */
export function generateStaticParams() {
  return regionParams();
}

type Props = { params: Promise<{ locale: string; viloyat: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, viloyat } = await params;
  return regionMetadata(locale, viloyat, false);
}

export default async function RegionPage({ params }: Props) {
  const { locale, viloyat } = await params;
  setRequestLocale(locale);
  return <CatalogRegion locale={locale} slug={viloyat} sp={{}} />;
}
