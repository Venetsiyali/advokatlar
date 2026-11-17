import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CatalogPageShell } from "@/components/lawyers/catalog-page";
import { Link } from "@/i18n/navigation";
import { lname } from "@/lib/localized";
import { alternates } from "@/lib/seo";
import { getCatalogCounts, getRegions, getSpecializations, parseFilters } from "@/server/lawyers";

// Katalog sahifalari ikki koʻrinishda ishlatiladi:
//   • ochiq marshrut (/advokatlar, /advokatlar/[viloyat], /advokatlar/yonalish/[slug]) — filtrsiz, statik (ISR), tez;
//   • ichki marshrut (/qidiruv/advokatlar/...) — filtr parametrlari bilan, har soʻrovda.
// middleware.ts filtrli soʻrovlarni ichki marshrutga yoʻnaltiradi (manzil satri oʻzgarmaydi).

export type SP = Record<string, string | string[] | undefined>;

/**
 * Filtrlangan variantlar indekslanmaydi — kanonik (filtrsiz) sahifa yetarli.
 * Advokatsiz (boʻsh) viloyat/yoʻnalish sahifasi ham indekslanmaydi; havolalar boʻylab yurish (follow) saqlanadi.
 */
const robots = (filtered: boolean, empty = false): Metadata["robots"] => (filtered || empty ? { index: false, follow: true } : undefined);

const chip = "rounded-full border border-navy-100 px-3 py-1.5 text-sm text-navy-700 hover:border-brand-500 hover:text-brand-700";

const getRegion = async (slug: string) => (await getRegions()).find((r) => r.slug === slug) ?? null;
const getSpec = async (slug: string) => (await getSpecializations()).find((s) => s.slug === slug) ?? null;

// ---------- Barcha advokatlar ----------

export async function catalogMetadata(locale: string, filtered: boolean): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("catalogTitle"),
    description: t("catalogDescription"),
    alternates: alternates(locale, "/advokatlar"),
    robots: robots(filtered),
  };
}

export async function CatalogAll({ locale, sp }: { locale: string; sp: SP }) {
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

// ---------- Viloyat ----------

export async function regionMetadata(locale: string, slug: string, filtered: boolean): Promise<Metadata> {
  const region = await getRegion(slug);
  if (!region) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = lname(region, locale);
  return {
    title: t("regionTitle", { region: name }),
    description: t("regionDescription", { region: name }),
    alternates: alternates(locale, `/advokatlar/${region.slug}`),
    robots: robots(filtered, !(await getCatalogCounts()).regions[region.id]),
  };
}

export async function CatalogRegion({ locale, slug, sp }: { locale: string; slug: string; sp: SP }) {
  const region = await getRegion(slug);
  if (!region) notFound();
  const [t, regions] = await Promise.all([getTranslations("catalog"), getRegions()]);
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
                <Link key={r.slug} href={`/advokatlar/${r.slug}`} className={chip}>
                  {lname(r, locale)}
                </Link>
              ))}
          </div>
        </section>
      }
    />
  );
}

// ---------- Yoʻnalish ----------

export async function specMetadata(locale: string, slug: string, filtered: boolean): Promise<Metadata> {
  const spec = await getSpec(slug);
  if (!spec) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = lname(spec, locale);
  return {
    title: t("specTitle", { spec: name }),
    description: t("specDescription", { spec: name }),
    alternates: alternates(locale, `/advokatlar/yonalish/${spec.slug}`),
    robots: robots(filtered, !(await getCatalogCounts()).specs[spec.id]),
  };
}

export async function CatalogSpec({ locale, slug, sp }: { locale: string; slug: string; sp: SP }) {
  const spec = await getSpec(slug);
  if (!spec) notFound();
  const [t, specs] = await Promise.all([getTranslations("catalog"), getSpecializations()]);
  const name = lname(spec, locale);
  return (
    <CatalogPageShell
      locale={locale}
      path={`/advokatlar/yonalish/${spec.slug}`}
      title={t("specHeading", { spec: name })}
      intro={t("specIntro", { spec: name })}
      crumbs={[{ href: "/advokatlar", label: t("title") }, { label: name }]}
      filters={{ ...parseFilters(sp), spec: spec.slug }}
      searchParams={sp}
      hide={["yonalish"]}
      extra={
        <section className="mt-14">
          <h2 className="text-lg font-bold">{t("specialization")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {specs
              .filter((s) => s.id !== spec.id)
              .map((s) => (
                <Link key={s.slug} href={`/advokatlar/yonalish/${s.slug}`} className={chip}>
                  {lname(s, locale)}
                </Link>
              ))}
          </div>
        </section>
      }
    />
  );
}
