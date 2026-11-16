import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogPageShell } from "@/components/lawyers/catalog-page";
import { Link } from "@/i18n/navigation";
import { lname } from "@/lib/localized";
import { alternates } from "@/lib/seo";
import { getRegions, parseFilters } from "@/server/lawyers";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; viloyat: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getRegion = async (slug: string) => (await getRegions()).find((r) => r.slug === slug) ?? null;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, viloyat } = await params;
  const region = await getRegion(viloyat);
  if (!region) return {};
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = lname(region, locale);
  return {
    title: t("regionTitle", { region: name }),
    description: t("regionDescription", { region: name }),
    alternates: alternates(locale, `/advokatlar/${region.slug}`),
    robots: Object.keys(sp).length > 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { locale, viloyat } = await params;
  setRequestLocale(locale);
  const region = await getRegion(viloyat);
  if (!region) notFound();
  const sp = await searchParams;
  const [t, regions] = await Promise.all([
    getTranslations("catalog"),
    getRegions(),
  ]);
  const name = lname(region, locale);

  return (
    <CatalogPageShell
      locale={locale}
      path={`/advokatlar/${region.slug}`}
      title={t("regionHeading", { region: name })}
      intro={t("regionIntro", { region: name })}
      crumbs={[{ href: "/advokatlar", label: t("title") }, { label: name }]}
      filters={{ ...parseFilters(sp), region: region.slug }}
      searchParams={sp}
      hide={["viloyat"]}
      extra={
        <section className="mt-14">
          <h2 className="text-lg font-bold">{t("otherRegions")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {regions
              .filter((r) => r.id !== region.id)
              .map((r) => (
                <Link
                  key={r.slug}
                  href={`/advokatlar/${r.slug}`}
                  className="rounded-full border border-navy-100 px-3 py-1.5 text-sm text-navy-700 hover:border-brand-500 hover:text-brand-700"
                >
                  {lname(r, locale)}
                </Link>
              ))}
          </div>
        </section>
      }
    />
  );
}
