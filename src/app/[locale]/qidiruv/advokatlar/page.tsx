import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CatalogAll, catalogMetadata, type SP } from "@/components/lawyers/catalog-routes";

// Ichki marshrut: /advokatlar?filtrlar → middleware shu yerga yoʻnaltiradi (manzil satri oʻzgarmaydi)
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return catalogMetadata((await params).locale, true);
}

export default async function FilteredCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CatalogAll locale={locale} sp={await searchParams} />;
}
