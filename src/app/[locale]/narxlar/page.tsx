import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Gift } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { planFeatures } from "@/lib/plan-features";
import { alternates, jsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { formatUzs } from "@/lib/utils";
import { getSetting } from "@/server/lawyers";
import { buttonVariants } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { PageHeader } from "@/components/site/page-header";

/** ISR: sahifa keshlanadi; admin tahriri revalidatePath orqali darhol yangilaydi */
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title"), description: t("metaDescription"), alternates: alternates(locale, "/narxlar") };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, format, plans, trialDays, trialDeadline] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("common"),
    getFormatter(),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getSetting<number>("trialDays", 30),
    getSetting<string>("trialDeadline", "2027-06-30"),
  ]);
  const featureLists = await Promise.all(plans.map((p) => planFeatures(p.features)));
  const deadline = new Date(`${trialDeadline}T23:59:59`);
  const trialActive = trialDays > 0 && deadline >= new Date();
  const faq = [1, 2, 3].map((i) => ({ q: t(`q${i}`), a: t(`a${i}`) }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          ...plans.map((p) => ({
            "@context": "https://schema.org",
            "@type": "Offer",
            name: lname(p, locale),
            price: p.priceUzs,
            priceCurrency: "UZS",
            seller: { "@type": "Organization", name: site.brand },
          })),
        ])}
      />
      <PageHeader locale={locale} path="/narxlar" title={t("title")} lead={t("lead")} />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="flex flex-col rounded-3xl border border-navy-100 bg-white p-6 shadow-soft md:p-8">
          <h2 className="text-lg font-bold text-navy-900">{t("clientsTitle")}</h2>
          <p className="mt-3 text-4xl font-extrabold text-brand-700">{t("free")}</p>
          <ul className="mt-6 space-y-3">
            {(["c1", "c2", "c3", "c4"] as const).map((k) => (
              <li key={k} className="flex gap-2.5 text-slate-700">
                <Check className="mt-0.5 size-5 shrink-0 text-brand-600" /> {t(k)}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <Link href="/murojaat" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
              {t("clientsCta")}
            </Link>
          </div>
        </section>

        {plans.map((p, i) => {
          const features = featureLists[i];
          return (
            <section key={p.id} className="relative flex flex-col rounded-3xl bg-navy-900 p-6 text-white shadow-lift md:p-8">
              {trialActive && (
                <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-white">
                  <Gift className="size-3.5" /> {t("trialBadge", { days: trialDays })}
                </span>
              )}
              <h2 className="text-lg font-bold">
                {t("lawyersTitle")} · {lname(p, locale)}
              </h2>
              <p className="mt-3">
                <span className="text-4xl font-extrabold">{tc("sum", { amount: formatUzs(p.priceUzs) })}</span>{" "}
                <span className="text-navy-200">{t("perPeriod", { days: p.periodDays })}</span>
              </p>
              {features.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-navy-100">
                      <Check className="mt-0.5 size-5 shrink-0 text-brand-400" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {trialActive && (
                <p className="mt-6 rounded-xl bg-white/10 p-3 text-sm text-navy-100">
                  {t("trialText", { days: trialDays, deadline: format.dateTime(deadline, { dateStyle: "long" }) })}
                </p>
              )}
              <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className={buttonVariants({ variant: "primary", size: "lg", className: "mt-6 w-full" })}>
                {t("lawyersCta")}
              </Link>
            </section>
          );
        })}
      </div>

      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="text-center text-2xl font-extrabold">{t("faqTitle")}</h2>
        <div className="mt-6">
          <Accordion items={faq} />
        </div>
      </section>
    </div>
  );
}
