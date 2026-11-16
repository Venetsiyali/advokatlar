import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CatalogSpec, specMetadata } from "@/components/lawyers/catalog-routes";
import { specParams } from "@/server/static-params";

// Yoʻnalish sahifasi — statik (ISR, birinchi soʻrovda generatsiya), 60 soniyada yangilanadi
export const revalidate = 60;

/** Build vaqtida mavjud yozuvlar oldindan tayyorlanadi; yangilari — birinchi soʻrovda (ISR) */
export function generateStaticParams() {
  return specParams();
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  return specMetadata(locale, slug, false);
}

export default async function SpecPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <CatalogSpec locale={locale} slug={slug} sp={{}} />;
}
