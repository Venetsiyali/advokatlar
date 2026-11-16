import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs, CatalogView } from "./catalog-view";
import type { CatalogFilters } from "@/server/lawyers";
import { jsonLd, localeUrl } from "@/lib/seo";

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
      <Breadcrumbs items={all} />
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">{intro}</p>
      <div className="mt-8">
        <Suspense>
          <CatalogView basePath={path} filters={filters} searchParams={searchParams} hide={hide} />
        </Suspense>
      </div>
      {extra}
    </div>
  );
}
