"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };

export type FilterLabels = {
  filters: string;
  showFilters: string;
  region: string;
  district: string;
  specialization: string;
  experience: string;
  rating: string;
  language: string;
  sort: string;
  all: string;
  reset: string;
  search: string;
  searchPlaceholder: string;
};

export function CatalogFilters({
  basePath,
  hide = [],
  regions,
  districtsByRegion,
  specs,
  expOptions,
  ratingOptions,
  langOptions,
  sortOptions,
  labels,
  fixedRegion,
}: {
  basePath: string;
  hide?: ("viloyat" | "yonalish")[];
  regions: Opt[];
  districtsByRegion: Record<string, Opt[]>;
  specs: Opt[];
  expOptions: Opt[];
  ratingOptions: Opt[];
  langOptions: Opt[];
  sortOptions: Opt[];
  labels: FilterLabels;
  fixedRegion?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");

  const regionSlug = fixedRegion ?? sp.get("viloyat") ?? "";
  const districts = regionSlug ? (districtsByRegion[regionSlug] ?? []) : [];

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("sahifa");
    if ("viloyat" in patch) next.delete("tuman");
    const qs = next.toString();
    start(() => router.push(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  const select = (name: string, label: string, options: Opt[], allLabel = labels.all) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={sp.get(name) ?? ""}
        onChange={(e) => update({ [name]: e.target.value })}
        className="h-11 w-full rounded-xl border border-navy-100 bg-white px-3 text-sm text-navy-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.search}
            className="h-11 w-full rounded-xl border border-navy-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button type="submit" className="h-11 rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white hover:bg-navy-900">
          {labels.search}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={labels.showFilters}
          className="flex h-11 items-center gap-2 rounded-xl border border-navy-100 px-3 text-sm font-medium text-navy-800 lg:hidden"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </form>

      <div className={cn("mt-4 grid gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-1", !open && "hidden")}>
        {!hide.includes("viloyat") && select("viloyat", labels.region, regions)}
        {districts.length > 0 && select("tuman", labels.district, districts)}
        {!hide.includes("yonalish") && select("yonalish", labels.specialization, specs)}
        {select("tajriba", labels.experience, expOptions)}
        {select("reyting", labels.rating, ratingOptions)}
        {select("til", labels.language, langOptions)}
        {select("sort", labels.sort, sortOptions.slice(1), sortOptions[0].label)}
        <button
          type="button"
          onClick={() => {
            setQ("");
            start(() => router.push(basePath, { scroll: false }));
          }}
          className="h-11 rounded-xl text-sm font-medium text-slate-600 hover:bg-navy-50"
        >
          {labels.reset}
        </button>
      </div>
    </div>
  );
}
