import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Building2, Mail, Phone, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { htmlToText } from "@/lib/sanitize";
import { alternates } from "@/lib/seo";
import { site } from "@/lib/site";
import { staticContent, staticTitle, type StaticSlug } from "@/lib/static-pages";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "./page-header";

const getPage = (slug: StaticSlug) => prisma.staticPage.findUnique({ where: { slug } });

export async function staticPageMetadata(slug: StaticSlug, locale: string): Promise<Metadata> {
  const p = await getPage(slug);
  if (!p) return {};
  return {
    title: staticTitle(p, locale),
    description: htmlToText(staticContent(p, locale)).slice(0, 160),
    alternates: alternates(locale, `/${slug}`),
  };
}

/** Admin paneldan tahrirlanadigan maʼlumot sahifasi */
export async function StaticPageView({ slug, locale }: { slug: StaticSlug; locale: string }) {
  const p = await getPage(slug);
  if (!p) notFound();
  const [t, format] = await Promise.all([getTranslations("staticPage"), getFormatter()]);
  const isContact = slug === "aloqa";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader locale={locale} path={`/${slug}`} title={staticTitle(p, locale)} />
      {isContact && (
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <ContactCard icon={<Phone />} label={t("phone")} value={site.phone} href={`tel:${site.phone.replace(/\s/g, "")}`} />
          <ContactCard icon={<Mail />} label={t("email")} value={site.email} href={`mailto:${site.email}`} />
          <ContactCard icon={<Send />} label={t("telegram")} value={`@${site.telegramBot}`} href={`https://t.me/${site.telegramBot}`} />
          <ContactCard icon={<Building2 />} label={t("operator")} value={site.operator} />
        </section>
      )}
      {/* Kontent saqlanganda sanitize-html bilan tozalangan */}
      <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: staticContent(p, locale) }} />
      <p className="mt-10 border-t border-navy-100 pt-4 text-sm text-slate-500">
        {t("updated", { date: format.dateTime(p.updatedAt, { dateStyle: "long" }) })}
      </p>
      {isContact && (
        <Link href="/murojaat" className={buttonVariants({ size: "lg", className: "mt-6" })}>
          {t("requestCta")}
        </Link>
      )}
    </div>
  );
}

function ContactCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-500">{label}</span>
        <span className="block break-words font-semibold text-navy-900">{value}</span>
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-soft";
  return href ? (
    <a href={href} className={`${cls} hover:border-brand-100`} {...(href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
