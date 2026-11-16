import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/lawyers/catalog-view";
import { jsonLd, localeUrl } from "@/lib/seo";

/** Ochiq sahifalar uchun: breadcrumb (+ JSON-LD), sarlavha va kirish matni */
export async function PageHeader({
  locale,
  path,
  title,
  lead,
  crumbs = [],
  children,
}: {
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
    <header>
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
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy-900 md:text-4xl">{title}</h1>
      {lead && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">{lead}</p>}
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
