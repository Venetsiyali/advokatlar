import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/lawyers/catalog-view";
import { jsonLd, localeUrl } from "@/lib/seo";
import { MotifArt, motifFor } from "@/components/art/court-art";

/**
 * Ochiq sahifalar uchun: breadcrumb (+ JSON-LD), sarlavha va kirish matni.
 * `banner` (standart) — toʻq koʻk rasmiy panel, ustun naqshi va sud predmeti rasmi bilan;
 * `plain` — maqolalar kabi oʻzining muqovasi bor sahifalar uchun.
 */
export async function PageHeader({
  locale,
  path,
  title,
  lead,
  crumbs = [],
  children,
  variant = "banner",
}: {
  variant?: "banner" | "plain";
  locale: string;
  path: string;
  title: string;
  lead?: string | null;
  crumbs?: { href?: string; label: string }[];
  children?: React.ReactNode;
}) {
  const tc = await getTranslations("common");
  const all = [{ href: "/", label: tc("home") }, ...crumbs, { label: title }];
  return (
    <header
      className={
        variant === "banner" ? "relative isolate overflow-hidden rounded-3xl bg-navy-900 px-5 py-7 text-white shadow-lift sm:px-10 sm:py-10" : undefined
      }
    >
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
      {variant === "banner" && (
        <>
          <div className="bg-columns absolute inset-0 -z-10" aria-hidden />
          <MotifArt
            id={`ph${path.replace(/[^a-z0-9]/gi, "-")}`}
            motif={motifFor(path)}
            className="pointer-events-none absolute -right-16 top-1/2 -z-10 h-[130%] max-h-72 -translate-y-1/2 opacity-25 sm:-right-6 md:opacity-90"
          />
        </>
      )}
      <Breadcrumbs items={all} dark={variant === "banner"} />
      <h1
        className={
          variant === "banner"
            ? "animate-fade-up mt-3 max-w-3xl text-3xl font-extrabold text-white md:text-[2.6rem] md:leading-tight"
            : "mt-3 text-3xl font-extrabold text-navy-900 md:text-4xl"
        }
      >
        {title}
      </h1>
      {lead && (
        <p className={variant === "banner" ? "mt-3 max-w-2xl text-base leading-relaxed text-navy-100 sm:text-lg" : "mt-3 max-w-3xl text-lg leading-relaxed text-slate-600"}>
          {lead}
        </p>
      )}
      {children}
    </header>
  );
}

/** Sahifa oxiridagi “murojaat qoldiring” bloki */
export function CtaBox({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <section className="mt-12 flex flex-col items-start gap-4 rounded-3xl bg-navy-900 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-navy-200">{text}</p>
      </div>
      {action}
    </section>
  );
}
