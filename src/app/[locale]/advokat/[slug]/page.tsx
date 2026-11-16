import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Briefcase, Building2, Clock, GraduationCap, Languages, Lock, MapPin, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/lawyers/avatar";
import { RatingStars } from "@/components/lawyers/rating-stars";
import { Breadcrumbs } from "@/components/lawyers/catalog-view";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getLawyerBySlug } from "@/server/lawyers";
import { lname } from "@/lib/localized";
import { alternates, jsonLd, localeUrl } from "@/lib/seo";
import { formatUzs } from "@/lib/utils";
import { lawyerParams } from "@/server/static-params";

/** ISR: sahifa keshlanadi; admin tahriri revalidatePath orqali darhol yangilaydi */
export const revalidate = 300;

/** Build vaqtida mavjud yozuvlar oldindan tayyorlanadi; yangilari — birinchi soʻrovda (ISR) */
export function generateStaticParams() {
  return lawyerParams();
}

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(slug: string) {
  const l = await getLawyerBySlug(slug);
  // Faqat tasdiqlangan va bloklanmagan advokatlar ommaga koʻrinadi
  if (!l || l.status !== "TASDIQLANGAN" || l.user.isBlocked) return null;
  return l;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = await load(slug);
  if (!l) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const region = lname(l.region, locale);
  const specs = l.specializations.map((s) => lname(s.specialization, locale)).join(", ");
  return {
    title: t("lawyerTitle", { name: l.fullName, region }),
    description: t("lawyerDescription", { name: l.fullName, exp: l.experienceYears, specs }),
    alternates: alternates(locale, `/advokat/${l.slug}`),
    openGraph: { type: "profile", title: l.fullName, images: l.avatarUrl ? [l.avatarUrl] : undefined },
  };
}

export default async function LawyerPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const l = await load(slug);
  if (!l) notFound();

  const [t, tc, tl, tcat, format] = await Promise.all([
    getTranslations("profile"),
    getTranslations("common"),
    getTranslations("lang"),
    getTranslations("catalog"),
    getFormatter(),
  ]);
  const specs = l.specializations.map((s) => s.specialization);
  const location = [lname(l.region, locale), l.district && lname(l.district, locale)].filter(Boolean).join(", ");
  const contactHref = { pathname: "/murojaat", query: { advokat: l.slug } } as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "Attorney",
            name: l.fullName,
            url: localeUrl(locale, `/advokat/${l.slug}`),
            image: l.avatarUrl ?? undefined,
            areaServed: lname(l.region, locale),
            knowsLanguage: l.languages,
            address: { "@type": "PostalAddress", addressRegion: lname(l.region, locale), addressCountry: "UZ" },
            ...(l.reviewCount > 0 && {
              aggregateRating: { "@type": "AggregateRating", ratingValue: l.rating, reviewCount: l.reviewCount, bestRating: 5 },
            }),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: tc("home"), item: localeUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: tcat("title"), item: localeUrl(locale, "/advokatlar") },
              { "@type": "ListItem", position: 3, name: l.fullName, item: localeUrl(locale, `/advokat/${l.slug}`) },
            ],
          },
        ])}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: tc("home") },
          { href: "/advokatlar", label: tcat("title") },
          ...(l.region ? [{ href: `/advokatlar/${l.region.slug}`, label: lname(l.region, locale) }] : []),
          { label: l.fullName },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Sarlavha kartochkasi */}
          <Card className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row">
              <Avatar name={l.fullName} src={l.avatarUrl} className="size-28 shrink-0 text-3xl" />
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{l.fullName}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.licenseVerified && (
                    <Badge variant="brand">
                      <BadgeCheck className="size-3.5" /> {tc("verified")}
                    </Badge>
                  )}
                  {l.isOnDuty && <Badge variant="gold">{tc("onDuty")}</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RatingStars value={l.rating} size="md" />
                  <span className="text-lg font-bold">{l.rating > 0 ? l.rating.toFixed(1) : "—"}</span>
                  <a href="#izohlar" className="text-sm text-slate-500 hover:underline">
                    {tc("reviews", { count: l.reviewCount })}
                  </a>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {specs.map((s) => (
                    <Link key={s.id} href={`/advokatlar/yonalish/${s.slug}`}>
                      <Badge variant="outline" className="hover:border-brand-500">
                        {lname(s, locale)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {l.bio && (
            <Card className="p-6">
              <h2 className="text-lg font-bold">{t("about")}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{l.bio}</p>
            </Card>
          )}

          <Card className="p-6">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Info icon={Briefcase} label={t("experience")} value={tc("years", { count: l.experienceYears })} />
              <Info icon={MapPin} label={t("location")} value={location} />
              {l.education && <Info icon={GraduationCap} label={t("education")} value={l.education} />}
              {l.workplace && <Info icon={Building2} label={t("workplace")} value={l.workplace} />}
              <Info
                icon={BadgeCheck}
                label={t("license")}
                value={
                  <span className="flex flex-wrap items-center gap-2">
                    {l.licenseNumber ?? "—"}
                    <Badge variant={l.licenseVerified ? "brand" : "neutral"}>
                      {l.licenseVerified ? t("licenseVerified") : t("licenseNotVerified")}
                    </Badge>
                  </span>
                }
              />
              <Info icon={Languages} label={tc("languages")} value={l.languages.map((x) => (tl.has(x) ? tl(x) : x)).join(", ")} />
              <Info
                icon={Wallet}
                label={t("fee")}
                value={l.consultationFee ? t("feeFrom", { amount: formatUzs(l.consultationFee) }) : t("feeOnRequest")}
              />
              {l.avgResponseMins && <Info icon={Clock} label="" value={t("responseTime", { mins: l.avgResponseMins })} />}
            </dl>
          </Card>

          <Card id="izohlar" className="scroll-mt-24 p-6">
            <h2 className="text-lg font-bold">{t("reviewsTitle")}</h2>
            {l.reviews.length === 0 ? (
              <p className="mt-3 text-slate-500">{t("noReviews")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-navy-100">
                {l.reviews.map((r) => (
                  <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{r.authorName}</span>
                      <time className="text-xs text-slate-500" dateTime={r.createdAt.toISOString()}>
                        {format.dateTime(r.createdAt, { dateStyle: "medium" })}
                      </time>
                    </div>
                    <RatingStars value={r.rating} />
                    {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Murojaat bloki */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <Link href={contactHref} className={buttonVariants({ size: "lg", className: "w-full" })}>
              {t("contactCta")}
            </Link>
            <p className="mt-4 flex gap-2 text-sm leading-relaxed text-slate-600">
              <Lock className="mt-0.5 size-4 shrink-0 text-navy-500" /> {t("contactNote")}
            </p>
          </Card>
        </aside>
      </div>

      {/* Mobil: pastki yopishqoq tugma */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <Link href={contactHref} className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("contactCta")}
        </Link>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
        <Icon className="size-5" />
      </div>
      <div>
        {label && <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>}
        <dd className="mt-0.5 text-sm text-navy-900">{value}</dd>
      </div>
    </div>
  );
}
