import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, FileText, Gift, Landmark, Lock, MapPinned, Scale, Search, UserCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { TopicIcon } from "@/components/icons";
import { ArticleCover, CourtHeroArt, MotifArt } from "@/components/art/court-art";
import { prisma } from "@/lib/db";
import { getArticlesPage, getFeaturedLawyers, getHomeStats, getSetting, getTopLawyers } from "@/server/lawyers";
import { articleText, ltitle, topicSummary } from "@/lib/localized";
import { readingMinutes } from "@/lib/sanitize";
import { cn, formatUzs } from "@/lib/utils";
import { jsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 300;

const TOP_N = 5;
const ROMAN = ["I", "II", "III", "IV"];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [t, ta, stats, topMonth, topAll, featured, topics, articles, trialDays, price] = await Promise.all([
    getTranslations(),
    getTranslations("articles"),
    getHomeStats(),
    getTopLawyers({ limit: TOP_N, from: monthStart }),
    getTopLawyers({ limit: 10 }),
    getFeaturedLawyers(10),
    prisma.topicPage.findMany({ where: { published: true, showOnHome: true }, orderBy: { sortOrder: "asc" }, take: 8 }),
    getArticlesPage(locale, 1, 3).catch(() => ({ rows: [], total: 0 })),
    getSetting<number>("trialDays", 30),
    getSetting<number>("monthlyPriceUzs", 99000),
  ]);

  // Reyting: avval shu oy baholanganlar, keyin umumiy reyting; baholanganlar kam boʻlsa —
  // tasdiqlangan advokatlar bilan toʻldiriladi (ular oʻrin medalisiz koʻrsatiladi)
  const ranked = [...topMonth, ...topAll.filter((x) => !topMonth.some((m) => m.lawyer.id === x.lawyer.id))].slice(0, TOP_N);
  const lawyers = [
    ...ranked.map((x, i) => ({ lawyer: x.lawyer, place: i + 1 })),
    ...featured.filter((f) => !ranked.some((r) => r.lawyer.id === f.id)).map((lawyer) => ({ lawyer, place: undefined })),
  ].slice(0, TOP_N);
  const mode = ranked.length > 0 ? "rated" : lawyers.length > 0 ? "featured" : "empty";

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

      {/* HERO — rasmiy toʻq koʻk fon, sud binosi ustunlari naqshi va illyustratsiya */}
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="bg-columns absolute inset-0 -z-10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-navy-950/60 to-transparent" aria-hidden />
        {/* Telefonda illyustratsiya matn orqasida xira fon sifatida — ekran balandligini egallamaydi */}
        <CourtHeroArt id="hero-bg" animated={false} className="pointer-events-none absolute -right-24 top-10 -z-10 w-[26rem] opacity-[0.13] md:hidden" />

        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-24 pt-7 sm:pb-32 md:grid-cols-[1.1fr_1fr] md:pt-10 lg:pb-36">
          <div>
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200 backdrop-blur">
              <Scale className="size-3.5" /> {t("hero.badge")}
            </span>
            <h1
              className="animate-fade-up mt-5 text-[2rem] font-extrabold leading-[1.15] text-white sm:text-5xl lg:text-[3.4rem]"
              style={{ animationDelay: "80ms" }}
            >
              {t.rich("hero.title", { hl: (c) => <span className="text-gold-shine">{c}</span> })}
            </h1>
            <p className="animate-fade-up mt-4 max-w-xl text-[0.95rem] leading-relaxed text-navy-100 sm:mt-5 sm:text-lg" style={{ animationDelay: "160ms" }}>
              {t("hero.subtitle")}
            </p>
            <div className="animate-fade-up mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3" style={{ animationDelay: "240ms" }}>
              <Link href="/murojaat" className={buttonVariants({ size: "lg" })}>
                <Search /> {t("hero.ctaFind")}
              </Link>
              <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className={buttonVariants({ variant: "glass", size: "lg" })}>
                {t("hero.ctaJoin")}
              </Link>
            </div>
            <ul className="animate-fade-up mt-7 hidden flex-wrap gap-x-6 gap-y-2 text-sm text-navy-100 sm:flex" style={{ animationDelay: "320ms" }}>
              {[t("hero.point1"), t("hero.point2"), t("hero.point3")].map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand-400" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-fade-in relative hidden md:block" style={{ animationDelay: "200ms" }}>
            <CourtHeroArt id="hero" className="mx-auto w-full max-w-[34rem] drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* REYTINGI ENG YUQORI ADVOKATLAR — hero ustiga chiqib turadigan panel: birinchi ekrandayoq koʻrinadi */}
      <section className="relative z-10 mx-auto -mt-20 max-w-6xl px-3 sm:-mt-24 sm:px-4">
        <div className="animate-fade-up rounded-3xl border border-navy-100/70 bg-white p-4 shadow-lift sm:p-8" style={{ animationDelay: "380ms" }}>
        <SectionHead
          eyebrow={t("nav.rating")}
          title={mode === "featured" ? t("top.titleFeatured") : t("top.title")}
          subtitle={mode === "featured" ? t("top.subtitleFeatured") : t("top.subtitle")}
        >
          {mode !== "empty" && (
            <Link href={mode === "rated" ? "/reyting" : "/advokatlar"} className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
              {mode === "rated" ? t("top.seeAll") : t("services.all")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </SectionHead>
        {mode === "empty" ? (
          <div className="reveal mt-8 flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <MotifArt id="top-empty" motif="scales" animated className="h-32 w-auto shrink-0 sm:h-36" />
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-navy-900">{t("top.emptyTitle")}</h3>
              <p className="mt-2 text-slate-600">{t("top.emptyText")}</p>
            </div>
            <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className={buttonVariants({ variant: "navy" })}>
              {t("hero.ctaJoin")}
            </Link>
          </div>
        ) : (
          // Telefonda — yonga suriladigan karusel (snap), katta ekranda — panjara
          <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 pt-4 [scrollbar-width:none] sm:mx-0 sm:mt-7 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
            {lawyers.map((x) => (
              <div key={x.lawyer.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
                <LawyerCard lawyer={x.lawyer} place={x.place} stacked className="h-full" />
              </div>
            ))}
          </div>
        )}
        </div>
      </section>

      {/* STATISTIKA (bazadan jonli) */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
        <div className="reveal grid grid-cols-2 overflow-hidden rounded-3xl border border-navy-100/70 bg-white shadow-soft md:grid-cols-4">
          {[
            { v: stats.lawyers, l: t("stats.lawyers"), I: UserCheck },
            { v: stats.requests, l: t("stats.requests"), I: FileText },
            { v: stats.regions, l: t("stats.regions"), I: MapPinned },
            { v: "24/7", l: t("stats.support"), I: Clock },
          ].map(({ v, l, I }, i) => (
            <div key={l} className={cn("flex items-center gap-3 border-navy-100/70 p-4 sm:gap-4 sm:p-6", i % 2 === 0 && "border-r", i < 2 && "border-b md:border-b-0", i === 1 && "md:border-r")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:size-12">
                <I className="size-5 sm:size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-2xl font-extrabold leading-none text-navy-900 sm:text-3xl">{typeof v === "number" ? formatUzs(v) : v}</p>
                <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-sm">{l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ISHONCH BELGILARI */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h2 className="sr-only">{t("trust.title")}</h2>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {[
            { I: BadgeCheck, title: t("trust.licenseTitle"), text: t("trust.licenseText") },
            { I: Gift, title: t("trust.freeTitle"), text: t("trust.freeText") },
            { I: Lock, title: t("trust.privacyTitle"), text: t("trust.privacyText") },
          ].map(({ I, title, text }) => (
            <div key={title} className="reveal group flex gap-4 rounded-2xl border border-navy-100/70 bg-gradient-to-br from-white to-navy-50/60 p-5 transition-shadow hover:shadow-soft">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-brand-300 shadow-soft transition-transform duration-300 group-hover:-rotate-6">
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

      {/* XIZMATLAR (huquq sohalari) */}
      <section id="xizmatlar" className="scroll-mt-20 border-y border-navy-100/60 bg-navy-50/50 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHead eyebrow={t("nav.services")} title={t("services.title")} subtitle={t("services.subtitle")} />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {topics.map((tp, i) => (
              <Link
                key={tp.slug}
                href={`/mavzu/${tp.slug}`}
                className="reveal group relative overflow-hidden rounded-2xl border border-navy-100 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift sm:p-5"
                style={{ animationDelay: `${(i % 4) * 50}ms` }}
              >
                <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-brand-300 transition-transform duration-500 group-hover:scale-x-100" aria-hidden />
                <div className="flex size-11 items-center justify-center rounded-xl bg-navy-900 text-brand-300 transition-colors group-hover:bg-brand-500 group-hover:text-navy-950">
                  <TopicIcon name={tp.icon} className="size-5" />
                </div>
                <h3 className="mt-4 font-bold leading-snug text-navy-900">{ltitle(tp, locale)}</h3>
                {topicSummary(tp, locale) && <p className="mt-1 line-clamp-2 hidden text-sm text-slate-600 sm:block">{topicSummary(tp, locale)}</p>}
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/advokatlar" className={buttonVariants({ variant: "outline" })}>
              {t("services.all")} <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* QANDAY ISHLAYDI — rim raqamlari bilan (rasmiy uslub) */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <SectionHead title={t("how.title")} center />
        <ol className="relative mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
          <div className="absolute left-[8%] right-[8%] top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block" aria-hidden />
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="reveal relative flex gap-4 md:flex-col md:items-center md:text-center" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-brand-400 bg-navy-900 font-display text-lg font-bold text-brand-200 shadow-gold">
                {ROMAN[i - 1]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy-900 md:mt-4">{t(`how.s${i}Title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`how.s${i}Text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ADVOKATLAR UCHUN PROMO */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="reveal relative isolate overflow-hidden rounded-3xl bg-navy-900 px-6 py-10 text-white sm:px-10 md:py-14">
          <div className="bg-columns absolute inset-0 -z-10" aria-hidden />
          <MotifArt id="promo-bg" motif="gavel" className="pointer-events-none absolute -right-14 -top-4 -z-10 w-56 opacity-25 md:hidden" />
          <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-300">
                <Landmark className="size-4" /> {t("promo.badge")}
              </span>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-4xl">{t("promo.title")}</h2>
              <p className="mt-3 text-navy-100">{t("promo.text")}</p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {[
                  t("promo.b1", { days: trialDays }),
                  t("promo.b2", { price: t("common.sum", { amount: formatUzs(price) }) }),
                  t("promo.b3"),
                  t("promo.b4"),
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-400" /> <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className={buttonVariants({ size: "lg" })}>
                  {t("promo.cta")}
                </Link>
                <Link href="/narxlar" className={buttonVariants({ variant: "glass", size: "lg" })}>
                  {t("promo.pricing")}
                </Link>
              </div>
            </div>
            <MotifArt id="promo" motif="gavel" animated className="mx-auto hidden w-full max-w-sm md:block" />
          </div>
        </div>
      </section>

      {/* FOYDALI MAQOLALAR */}
      {articles.rows.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <SectionHead eyebrow={t("nav.articles")} title={t("homeArticles.title")} subtitle={t("homeArticles.subtitle")}>
            <Link href="/maqolalar" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
              {t("homeArticles.all")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </SectionHead>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {articles.rows.map((a, i) => {
              const txt = articleText(a, locale);
              return (
                <Link
                  key={a.id}
                  href={`/maqolalar/${a.slug}`}
                  className="reveal group flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <ArticleCover seed={a.slug} className="aspect-[16/8]" />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="size-3.5" /> {ta("minutes", { count: readingMinutes(a.content) })}
                    </span>
                    <h3 className="mt-2 font-display text-lg font-bold leading-snug text-navy-900 transition-colors group-hover:text-brand-700">{txt.title}</h3>
                    {txt.excerpt && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{txt.excerpt}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10 sm:py-16">
        <SectionHead title={t("faq.title")} center />
        <div className="reveal mt-8">
          <Accordion items={faq} />
        </div>
      </section>
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  center,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between")}>
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            <span className="h-px w-6 bg-brand-500" aria-hidden /> {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-extrabold text-navy-900 sm:text-[2.1rem] sm:leading-tight">{title}</h2>
        {center && <span className="mx-auto mt-3 block h-0.5 w-14 rounded bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" aria-hidden />}
        {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
