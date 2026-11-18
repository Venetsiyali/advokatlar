import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LawyerCard } from "./lawyer-card";
import { CatalogFilters } from "./catalog-filters";
import { buttonVariants } from "@/components/ui/button";
import { getRegions, getSpecializations, searchLawyers, type CatalogFilters as F } from "@/server/lawyers";
import { lname } from "@/lib/localized";
import { cn } from "@/lib/utils";

export async function CatalogView({
  basePath,
  filters,
  searchParams,
  hide,
}: {
  basePath: string;
  filters: F;
  searchParams: Record<string, string | string[] | undefined>;
  hide?: ("viloyat" | "yonalish")[];
}) {
  const [t, tc, tl, locale, regions, specs, result] = await Promise.all([
    getTranslations("catalog"),
    getTranslations("common"),
    getTranslations("lang"),
    getLocale(),
    getRegions(),
    getSpecializations(),
    searchLawyers(filters),
  ]);

  const districtsByRegion = Object.fromEntries(
    regions.map((r) => [r.slug, r.districts.map((d) => ({ value: d.slug, label: lname(d, locale) }))]),
  );

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && v) qs.set(k, v);
    if (p > 1) qs.set("sahifa", String(p));
    else qs.delete("sahifa");
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <CatalogFilters
          basePath={basePath}
          hide={hide}
          fixedRegion={hide?.includes("viloyat") ? filters.region : undefined}
          current={Object.fromEntries(Object.entries(searchParams).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1]))}
          regions={regions.map((r) => ({ value: r.slug, label: lname(r, locale) }))}
          districtsByRegion={districtsByRegion}
          specs={specs.map((s) => ({ value: s.slug, label: lname(s, locale) }))}
          expOptions={[3, 5, 10, 15].map((y) => ({ value: String(y), label: t("expMin", { years: y }) }))}
          ratingOptions={[4, 4.5].map((v) => ({ value: String(v), label: t("ratingMin", { value: v }) }))}
          langOptions={["uz", "ru", "en", "kaa"].map((l) => ({ value: l, label: tl(l) }))}
          sortOptions={[
            { value: "", label: t("sortRating") },
            { value: "experience", label: t("sortExperience") },
            { value: "reviews", label: t("sortReviews") },
          ]}
          labels={{
            filters: t("filters"),
            showFilters: t("showFilters"),
            region: t("region"),
            district: t("district"),
            specialization: t("specialization"),
            experience: t("experience"),
            rating: t("rating"),
            language: t("language"),
            sort: t("sort"),
            all: tc("all"),
            reset: tc("reset"),
            search: tc("search"),
            searchPlaceholder: t("searchPlaceholder"),
          }}
        />
      </aside>

      <section aria-live="polite">
        <p className="mb-4 text-sm font-medium text-slate-600">{t("found", { count: result.total })}</p>
        {result.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy-200 p-10 text-center text-slate-500">{tc("noResults")}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((l) => (
              <LawyerCard key={l.id} lawyer={l} />
            ))}
          </div>
        )}

        {result.pages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
            <Link
              href={pageHref(result.page - 1)}
              aria-disabled={result.page <= 1}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), result.page <= 1 && "pointer-events-none opacity-40")}
            >
              <ChevronLeft /> {tc("prev")}
            </Link>
            <span className="text-sm text-slate-600">{tc("pageOf", { page: result.page, total: result.pages })}</span>
            <Link
              href={pageHref(result.page + 1)}
              aria-disabled={result.page >= result.pages}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                result.page >= result.pages && "pointer-events-none opacity-40",
              )}
            >
              {tc("next")} <ChevronRight />
            </Link>
          </nav>
        )}

        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-50 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-navy-900">{t("ctaTitle")}</p>
            <p className="text-sm text-slate-600">{t("ctaText")}</p>
          </div>
          <Link href="/murojaat" className={buttonVariants()}>
            {tc("findLawyer")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function Breadcrumbs({ items, dark }: { items: { href?: string; label: string }[]; dark?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", dark ? "text-navy-200" : "text-slate-500")}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href ? (
              <Link href={it.href} className={dark ? "hover:text-white" : "hover:text-navy-900"}>
                {it.label}
              </Link>
            ) : (
              <span className={dark ? "text-brand-200" : "text-navy-900"}>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
