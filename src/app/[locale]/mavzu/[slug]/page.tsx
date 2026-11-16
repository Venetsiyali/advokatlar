import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname, ltitle, topicContent, topicSummary } from "@/lib/localized";
import { htmlToText } from "@/lib/sanitize";
import { alternates, jsonLd, localeUrl } from "@/lib/seo";
import { site } from "@/lib/site";
import { lawyerCardInclude } from "@/server/lawyers";
import { buttonVariants } from "@/components/ui/button";
import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { CtaBox, PageHeader } from "@/components/site/page-header";
import { TopicIcon } from "@/components/icons";

/** ISR: sahifa keshlanadi; admin tahriri revalidatePath orqali darhol yangilaydi */
export const revalidate = 3600;

/** Sahifalar birinchi soʻrovda generatsiya qilinib keshlanadi */
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; slug: string }> };

const getTopic = cache((slug: string) =>
  prisma.topicPage.findFirst({ where: { slug, published: true }, include: { specialization: true } }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tp = await getTopic(slug);
  if (!tp) return {};
  const title = ltitle(tp, locale);
  const description = (topicSummary(tp, locale) || htmlToText(topicContent(tp, locale))).slice(0, 160);
  return { title, description, alternates: alternates(locale, `/mavzu/${tp.slug}`), openGraph: { title, description } };
}

export default async function TopicPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tp = await getTopic(slug);
  if (!tp) notFound();

  const [t, others, lawyers] = await Promise.all([
    getTranslations("topics"),
    prisma.topicPage.findMany({
      where: { published: true, id: { not: tp.id } },
      orderBy: { sortOrder: "asc" },
      take: 8,
      select: { id: true, slug: true, title: true, titleUzCyrl: true, titleRu: true, icon: true },
    }),
    tp.specializationId
      ? prisma.lawyerProfile.findMany({
          where: { status: "TASDIQLANGAN", user: { isBlocked: false }, specializations: { some: { specializationId: tp.specializationId } } },
          include: lawyerCardInclude,
          orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
          take: 3,
        })
      : [],
  ]);
  const title = ltitle(tp, locale);
  const summary = topicSummary(tp, locale);
  const path = `/mavzu/${tp.slug}`;
  const requestHref = { pathname: "/murojaat", query: { mavzu: tp.slug } };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Service",
          name: title,
          serviceType: tp.specialization ? lname(tp.specialization, locale) : title,
          description: summary ?? undefined,
          url: localeUrl(locale, path),
          areaServed: { "@type": "Country", name: "Uzbekistan" },
          provider: { "@type": "Organization", name: site.brand, url: site.url },
        })}
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <PageHeader locale={locale} path={path} title={title} lead={summary} crumbs={[{ href: "/mavzu", label: t("title") }]} />
          {/* Kontent saqlanganda sanitize-html bilan tozalangan */}
          <div className="prose-content mt-6 text-[1.05rem]" dangerouslySetInnerHTML={{ __html: topicContent(tp, locale) }} />
          <p className="mt-6 flex gap-2 rounded-xl bg-navy-50 p-3 text-sm text-slate-600">
            <Info className="mt-0.5 size-4 shrink-0" /> {t("disclaimer")}
          </p>
        </div>

        <aside className="lg:pt-12">
          <div className="sticky top-24 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
              <TopicIcon name={tp.icon} className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-bold">{t("ctaTitle")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("ctaText")}</p>
            <Link href={requestHref} className={buttonVariants({ className: "mt-4 w-full" })}>
              {t("ctaButton")}
            </Link>
          </div>
        </aside>
      </div>

      {lawyers.length > 0 && tp.specialization && (
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-bold">{t("lawyersTitle")}</h2>
            <Link href={`/advokatlar/yonalish/${tp.specialization.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              {t("allLawyers")} <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {lawyers.map((l) => (
              <LawyerCard key={l.id} lawyer={l} />
            ))}
          </div>
        </section>
      )}

      <CtaBox
        title={t("ctaTitle")}
        text={t("ctaText")}
        action={
          <Link href={requestHref} className={buttonVariants({ variant: "primary", size: "lg" })}>
            {t("ctaButton")}
          </Link>
        }
      />

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold">{t("otherTopics")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.id}
                href={`/mavzu/${o.slug}`}
                className="rounded-full border border-navy-100 px-3 py-1.5 text-sm text-navy-700 hover:border-brand-500 hover:text-brand-700"
              >
                {ltitle(o, locale)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
