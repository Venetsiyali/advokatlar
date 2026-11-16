import { Link } from "@/i18n/navigation";
import { lname, type Named } from "@/lib/localized";
import { cn } from "@/lib/utils";

/** Hudud boʻyicha filtr — oddiy havolalar (JavaScript'siz, indekslanadigan) */
export function RegionChips({
  pathname,
  regions,
  value,
  allLabel,
  locale,
  query = {},
}: {
  pathname: string;
  regions: (Named & { slug: string })[];
  value: string;
  allLabel: string;
  locale: string;
  query?: Record<string, string>;
}) {
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
      active ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 bg-white text-navy-700 hover:border-brand-500",
    );
  const clean = (q: Record<string, string>) => Object.fromEntries(Object.entries(q).filter(([, v]) => v));
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
      <Link href={{ pathname, query: clean({ ...query, viloyat: "" }) }} className={chip(!value)}>
        {allLabel}
      </Link>
      {regions.map((r) => (
        <Link key={r.slug} href={{ pathname, query: clean({ ...query, viloyat: r.slug }) }} className={chip(value === r.slug)}>
          {lname(r, locale)}
        </Link>
      ))}
    </div>
  );
}
