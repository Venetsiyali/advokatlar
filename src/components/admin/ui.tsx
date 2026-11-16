import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Query = Record<string, string | number | undefined>;

/** Joriy query'ni saqlab, berilgan qiymatlarni almashtirib href yasaydi */
export function qhref(pathname: string, query: Query, patch: Query = {}) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...query, ...patch })) if (v !== undefined && v !== "" && v !== 1 && !(k === "page" && v === "1")) merged[k] = String(v);
  return { pathname, query: merged };
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-navy-900">{title}</h2>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Holat boʻyicha tablar (GET havolalar) */
export function FilterTabs({
  pathname,
  query,
  param,
  value,
  options,
}: {
  pathname: string;
  query: Query;
  param: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
}) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={qhref(pathname, query, { [param]: o.value || undefined, page: undefined })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
            value === o.value ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 bg-white text-navy-700 hover:bg-navy-50",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Oddiy GET qidiruv formasi — JavaScript'siz ishlaydi */
export async function SearchForm({ q, placeholder, hidden = {} }: { q: string; placeholder: string; hidden?: Record<string, string> }) {
  const t = await getTranslations("admin");
  return (
    <form method="get" className="mb-4 flex gap-2" role="search">
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-xl border border-navy-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <button className="h-10 rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white hover:bg-navy-900">{t("search")}</button>
    </form>
  );
}

export async function Pager({ pathname, query, page, total, pageSize }: { pathname: string; query: Query; page: number; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const t = await getTranslations("common");
  const btn = "inline-flex h-9 items-center gap-1 rounded-lg border border-navy-100 bg-white px-3 text-sm font-medium text-navy-700 hover:bg-navy-50";
  return (
    <nav className="mt-4 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={qhref(pathname, query, { page: page - 1 })} className={btn}>
          <ChevronLeft className="size-4" /> {t("prev")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-500">{t("pageOf", { page, total: pages })}</span>
      {page < pages ? (
        <Link href={qhref(pathname, query, { page: page + 1 })} className={btn}>
          {t("next")} <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Jadval: kichik ekranda gorizontal aylantiriladi */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-navy-100/70 bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-50">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-slate-500">
        {text}
      </td>
    </tr>
  );
}

const PILL: Record<string, string> = {
  KUTILMOQDA: "bg-amber-50 text-amber-700",
  TASDIQLANGAN: "bg-brand-50 text-brand-700",
  RAD: "bg-red-50 text-red-700",
  BLOK: "bg-slate-200 text-slate-700",
  SINOV: "bg-sky-50 text-sky-700",
  FAOL: "bg-brand-50 text-brand-700",
  MUDDATI_OTGAN: "bg-red-50 text-red-700",
  BEKOR: "bg-slate-100 text-slate-600",
  YUBORILDI: "bg-sky-50 text-sky-700",
  QABUL_QILDI: "bg-brand-50 text-brand-700",
  RAD_ETDI: "bg-red-50 text-red-700",
  BAND_QILINGAN: "bg-slate-100 text-slate-600",
  MUDDATI_OTDI: "bg-slate-100 text-slate-600",
};

export function Pill({ value, children }: { value: string; children: React.ReactNode }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", PILL[value] ?? "bg-navy-50 text-navy-700")}>{children}</span>;
}

export function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-navy-100/70 bg-white p-5 shadow-soft", className)}>
      {title && <h3 className="mb-3 font-bold text-navy-900">{title}</h3>}
      {children}
    </section>
  );
}

export function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="min-w-0 break-words text-navy-900">{children || "—"}</dd>
    </div>
  );
}
