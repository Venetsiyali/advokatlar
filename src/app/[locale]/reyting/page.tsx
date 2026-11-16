import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { lname } from "@/lib/localized";
import { alternates, jsonLd, localeUrl } from "@/lib/seo";
import { getRegions, getTopLawyers } from "@/server/lawyers";
import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { PageHeader } from "@/components/site/page-header";
import { RegionChips } from "@/components/site/region-chips";
import { cn } from "@/lib/utils";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ davr?: string; viloyat?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "rating" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: alternates(locale, "/reyting"),
    robots: sp.davr || sp.viloyat ? { index: false, follow: true } : undefined,
  };
}

export default async function RatingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const monthly = sp.davr === "oy";

  const regions = await getRegions();
  const region = regions.find((r) => r.slug === sp.viloyat);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [t, top] = await Promise.all([
    getTranslations("rating"),
    getTopLawyers({ limit: 30, from: monthly ? monthStart : undefined, regionId: region?.id }),
  ]);
  const regionName = region ? lname(region, locale) : null;

  const tab = (active: boolean) =>
    cn("rounded-xl px-4 py-2 text-sm font-semibold transition", active ? "bg-white text-navy-900 shadow-soft" : "text-slate-600 hover:text-navy-900");
  const regionQuery = region ? { viloyat: region.slug } : {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t("title"),
          itemListElement: top.slice(0, 10).map((x, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: localeUrl(locale, `/advokat/${x.lawyer.slug}`),
            name: x.lawyer.fullName,
          })),
        })}
      />
      <PageHeader locale={locale} path="/reyting" title={regionName ? `${t("title")}: ${regionName}` : t("title")} lead={t("lead")} />

      <div className="mt-6 inline-flex rounded-2xl bg-navy-50 p-1">
        <Link href={{ pathname: "/reyting", query: regionQuery }} className={tab(!monthly)}>
          {t("allTime")}
        </Link>
        <Link href={{ pathname: "/reyting", query: { ...regionQuery, davr: "oy" } }} className={tab(monthly)}>
          {t("month")}
        </Link>
      </div>
      <div className="mt-4">
        <RegionChips pathname="/reyting" regions={regions} value={region?.slug ?? ""} allLabel={t("allRegions")} locale={locale} query={monthly ? { davr: "oy" } : {}} />
      </div>

      {top.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-navy-50 p-10 text-center text-slate-600">{t("empty")}</p>
      ) : (
        <div className="mt-8 grid gap-x-4 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
          {top.map((x, i) => (
            <div key={x.lawyer.id}>
              <LawyerCard lawyer={x.lawyer} place={i + 1} />
              {monthly && <p className="mt-1.5 px-2 text-xs text-slate-500">{t("periodReviews", { count: x.periodReviews })}</p>}
            </div>
          ))}
        </div>
      )}

      <section className="mt-12 flex gap-3 rounded-2xl border border-navy-100 p-5">
        <Info className="mt-0.5 size-5 shrink-0 text-brand-600" />
        <div>
          <h2 className="font-bold">{t("methodTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t("method")}</p>
        </div>
      </section>
    </div>
  );
}
