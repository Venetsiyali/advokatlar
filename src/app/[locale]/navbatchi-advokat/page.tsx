import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Siren, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { alternates } from "@/lib/seo";
import { lawyerCardInclude } from "@/server/lawyers";
import { buttonVariants } from "@/components/ui/button";
import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { PageHeader } from "@/components/site/page-header";
import { RegionChips } from "@/components/site/region-chips";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ viloyat?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "duty" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: alternates(locale, "/navbatchi-advokat"),
    robots: (await searchParams).viloyat ? { index: false, follow: true } : undefined,
  };
}

export default async function DutyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const regions = await prisma.region.findMany({ orderBy: { sortOrder: "asc" } });
  const region = regions.find((r) => r.slug === sp.viloyat);
  const now = new Date();

  const [t, lawyers] = await Promise.all([
    getTranslations("duty"),
    // Faqat haqiqatan murojaat qabul qila oladiganlar: tasdiqlangan + obunasi faol
    prisma.lawyerProfile.findMany({
      where: {
        isOnDuty: true,
        status: "TASDIQLANGAN",
        user: { isBlocked: false },
        subscription: { status: { in: ["SINOV", "FAOL"] }, endsAt: { gt: now } },
        ...(region && { regionId: region.id }),
      },
      include: lawyerCardInclude,
      orderBy: [{ avgResponseMins: { sort: "asc", nulls: "last" } }, { rating: "desc" }],
      take: 30,
    }),
  ]);
  const requestHref = { pathname: "/murojaat", query: region ? { viloyat: region.slug } : {} };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        locale={locale}
        path="/navbatchi-advokat"
        title={region ? `${t("title")}: ${lname(region, locale)}` : t("title")}
        lead={t("lead")}
      >
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={requestHref} className={buttonVariants({ size: "lg" })}>
            <Zap /> {t("cta")}
          </Link>
          <span className="text-sm font-medium text-slate-500">{t("count", { count: lawyers.length })}</span>
        </div>
      </PageHeader>

      <div className="mt-8">
        <RegionChips pathname="/navbatchi-advokat" regions={regions} value={region?.slug ?? ""} allLabel={t("allRegions")} locale={locale} />
      </div>

      {lawyers.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-navy-50 p-10 text-center text-slate-600">{t("empty")}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lawyers.map((l) => (
            <LawyerCard key={l.id} lawyer={l} />
          ))}
        </div>
      )}

      <section className="mt-12 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <Siren className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="font-bold text-navy-900">{t("urgentTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{t("urgentText")}</p>
        </div>
      </section>
    </div>
  );
}
