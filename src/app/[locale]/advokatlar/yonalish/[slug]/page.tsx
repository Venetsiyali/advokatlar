import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogPageShell } from "@/components/lawyers/catalog-page";
import { Link } from "@/i18n/navigation";
import { lname } from "@/lib/localized";
import { alternates } from "@/lib/seo";
import { getSpecializations, parseFilters } from "@/server/lawyers";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getSpec = async (slug: string) => (await getSpecializations()).find((s) => s.slug === slug) ?? null;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const spec = await getSpec(slug);
  if (!spec) return {};
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = lname(spec, locale);
  return {
    title: t("specTitle", { spec: name }),
    description: t("specDescription", { spec: name }),
    alternates: alternates(locale, `/advokatlar/yonalish/${spec.slug}`),
    robots: Object.keys(sp).length > 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function SpecPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const spec = await getSpec(slug);
  if (!spec) notFound();
  const sp = await searchParams;
  const [t, specs] = await Promise.all([
    getTranslations("catalog"),
    getSpecializations(),
  ]);
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
                <Link
                  key={s.slug}
                  href={`/advokatlar/yonalish/${s.slug}`}
                  className="rounded-full border border-navy-100 px-3 py-1.5 text-sm text-navy-700 hover:border-brand-500 hover:text-brand-700"
                >
                  {lname(s, locale)}
                </Link>
              ))}
          </div>
        </section>
      }
    />
  );
}
