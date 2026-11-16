import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, FileText, Gift, Lock, Search, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { TopicIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { getHomeStats, getSetting, getTopLawyers } from "@/server/lawyers";
import { ltitle, topicSummary } from "@/lib/localized";
import { formatUzs } from "@/lib/utils";
import { jsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [t, stats, topMonth, topics, trialDays, price] = await Promise.all([
    getTranslations(),
    getHomeStats(),
    getTopLawyers({ limit: 5, from: monthStart }),
    prisma.topicPage.findMany({ where: { published: true, showOnHome: true }, orderBy: { sortOrder: "asc" }, take: 8 }),
    getSetting<number>("trialDays", 30),
    getSetting<number>("monthlyPriceUzs", 99000),
  ]);
  // Oy boshida izohlar kam boʻlsa — umumiy reyting bilan toʻldiramiz
  const top =
    topMonth.length >= 5
      ? topMonth
      : [
          ...topMonth,
          ...(await getTopLawyers({ limit: 10 })).filter((x) => !topMonth.some((m) => m.lawyer.id === x.lawyer.id)),
        ].slice(0, 5);

  const faq = [1, 2, 3, 4, 5].map((i) => ({ q: t(`faq.q${i}`), a: t(`faq.a${i}`) }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "LegalService",
            name: site.brand,
            url: site.url,
            areaServed: { "@type": "Country", name: "Uzbekistan" },
            description: t("meta.description"),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ])}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 to-white">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-100/60 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.25fr_1fr] md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft">
              <Sparkles className="size-3.5" /> {t("hero.badge")}
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
              {t.rich("hero.title", { hl: (c) => <span className="text-brand-600">{c}</span> })}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/murojaat" className={buttonVariants({ size: "lg" })}>
                <Search /> {t("hero.ctaFind")}
              </Link>
              <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t("hero.ctaJoin")}
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-700">
              {[t("hero.point1"), t("hero.point2"), t("hero.point3")].map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand-600" /> {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Statistika (bazadan jonli) */}
          <div className="grid grid-cols-2 gap-3 self-center">
            {[
              { v: stats.lawyers, l: t("stats.lawyers"), I: UserCheck },
              { v: stats.requests, l: t("stats.requests"), I: FileText },
              { v: stats.regions, l: t("stats.regions"), I: ShieldCheck },
              { v: "24/7", l: t("stats.support"), I: Clock },
            ].map(({ v, l, I }) => (
              <Card key={l} className="p-5">
                <I className="size-6 text-brand-600" aria-hidden />
                <p className="mt-3 text-3xl font-extrabold text-navy-900">{typeof v === "number" ? formatUzs(v) : v}</p>
                <p className="mt-1 text-sm text-slate-600">{l}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ISHONCH BELGILARI */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
        <h2 className="sr-only">{t("trust.title")}</h2>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {[
            { I: BadgeCheck, title: t("trust.licenseTitle"), text: t("trust.licenseText") },
            { I: Gift, title: t("trust.freeTitle"), text: t("trust.freeText") },
            { I: Lock, title: t("trust.privacyTitle"), text: t("trust.privacyText") },
          ].map(({ I, title, text }) => (
            <div key={title} className="flex gap-4 rounded-2xl bg-navy-50/60 p-4 sm:p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                <I className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOP-5 */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <SectionHead title={t("top.title")} subtitle={t("top.subtitle")}>
          <Link href="/reyting" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            {t("top.seeAll")} <ArrowRight className="size-4" />
          </Link>
        </SectionHead>
        {top.length === 0 ? (
          <p className="text-slate-500">{t("top.empty")}</p>
        ) : (
          // Telefonda — yonga suriladigan karusel (snap), katta ekranda — panjara
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 pt-3 [scrollbar-width:none] sm:mx-0 sm:mt-8 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
            {top.map((x, i) => (
              <LawyerCard key={x.lawyer.id} lawyer={x.lawyer} place={i + 1} className="w-[85%] shrink-0 snap-start sm:w-auto" />
            ))}
          </div>
        )}
      </section>

      {/* XIZMATLAR */}
      <section id="xizmatlar" className="scroll-mt-20 bg-navy-50/50 py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHead title={t("services.title")} subtitle={t("services.subtitle")} />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {topics.map((tp) => (
              <Link
                key={tp.slug}
                href={`/mavzu/${tp.slug}`}
                className="group rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-lift"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <TopicIcon name={tp.icon} className="size-5" />
                </div>
                <h3 className="mt-4 font-bold text-navy-900 group-hover:text-brand-700">{ltitle(tp, locale)}</h3>
                {topicSummary(tp, locale) && (
                  <p className="mt-1 line-clamp-2 hidden text-sm text-slate-600 sm:block">{topicSummary(tp, locale)}</p>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/advokatlar" className={buttonVariants({ variant: "outline" })}>
              {t("services.all")} <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* QANDAY ISHLAYDI */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <SectionHead title={t("how.title")} />
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="relative">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-navy-800 text-lg font-extrabold text-white">{i}</div>
              {i < 4 && <div className="absolute left-14 right-0 top-6 hidden h-px bg-navy-100 md:block" aria-hidden />}
              <h3 className="mt-4 text-lg font-bold text-navy-900">{t(`how.s${i}Title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`how.s${i}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ADVOKATLAR UCHUN PROMO */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="relative overflow-hidden rounded-3xl bg-navy-800 px-6 py-10 text-white sm:px-10 md:py-14">
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-brand-100">{t("promo.badge")}</span>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("promo.title")}</h2>
              <p className="mt-3 text-navy-100">{t("promo.text")}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className={buttonVariants({ size: "lg" })}>
                  {t("promo.cta")}
                </Link>
                <Link href="/narxlar" className={buttonVariants({ variant: "light", size: "lg" })}>
                  {t("promo.pricing")}
                </Link>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                t("promo.b1", { days: trialDays }),
                t("promo.b2", { price: t("common.sum", { amount: formatUzs(price) }) }),
                t("promo.b3"),
                t("promo.b4"),
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" /> <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10 sm:py-16">
        <SectionHead title={t("faq.title")} center />
        <div className="mt-8">
          <Accordion items={faq} />
        </div>
      </section>
    </>
  );
}

function SectionHead({
  title,
  subtitle,
  center,
  children,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"}`}>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
