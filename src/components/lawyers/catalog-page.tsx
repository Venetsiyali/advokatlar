import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs, CatalogView } from "./catalog-view";
import type { CatalogFilters } from "@/server/lawyers";
import { jsonLd, localeUrl } from "@/lib/seo";
import { MotifArt } from "@/components/art/court-art";

/** /advokatlar, /advokatlar/[viloyat], /advokatlar/yonalish/[slug] uchun umumiy sahifa qobigʻi */
export async function CatalogPageShell({
  locale,
  path,
  title,
  intro,
  crumbs,
  filters,
  searchParams,
  hide,
  extra,
}: {
  locale: string;
  path: string;
  title: string;
  intro: string;
  crumbs: { href?: string; label: string }[];
  filters: CatalogFilters;
  searchParams: Record<string, string | string[] | undefined>;
  hide?: ("viloyat" | "yonalish")[];
  extra?: React.ReactNode;
}) {
  const tc = await getTranslations("common");
  const all = [{ href: "/", label: tc("home") }, ...crumbs];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: localeUrl(locale, c.href ?? path),
          })),
        })}
      />
      {/* Rasmiy sarlavha paneli: ustun naqshi va sud binosi rasmi */}
      <header className="relative isolate overflow-hidden rounded-3xl bg-navy-900 px-5 py-7 text-white shadow-lift sm:px-10 sm:py-9">
        <div className="bg-columns absolute inset-0 -z-10" aria-hidden />
        <MotifArt
          id="catalog-head"
          motif="courthouse"
          className="pointer-events-none absolute -right-16 top-1/2 -z-10 h-[130%] max-h-64 -translate-y-1/2 opacity-25 sm:-right-4 md:opacity-90"
        />
        <Breadcrumbs items={all} dark />
        <h1 className="animate-fade-up mt-3 max-w-3xl text-3xl font-extrabold text-white md:text-[2.6rem] md:leading-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-navy-100 sm:text-lg">{intro}</p>
      </header>
      <div className="mt-8">
        <Suspense>
          <CatalogView basePath={path} filters={filters} searchParams={searchParams} hide={hide} />
        </Suspense>
      </div>
      {extra}
    </div>
  );
}
