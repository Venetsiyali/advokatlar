import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CatalogAll, catalogMetadata } from "@/components/lawyers/catalog-routes";

// Filtrsiz katalog — statik (ISR), 60 soniyada yangilanadi. Filtrli soʻrovlar middleware orqali /qidiruv/advokatlar ga.
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return catalogMetadata((await params).locale, false);
}

export default async function CatalogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CatalogAll locale={locale} sp={{}} />;
}
