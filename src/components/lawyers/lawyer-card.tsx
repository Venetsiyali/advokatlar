import { getLocale, getTranslations } from "next-intl/server";
import { Award, BadgeCheck, Briefcase, ChevronRight, Languages, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RatingStars } from "./rating-stars";
import { Avatar } from "./avatar";
import { lname } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { LawyerCardData } from "@/server/lawyers";

/** Reytingdagi oʻrin medali: oltin, kumush, bronza; qolganlari — toʻq koʻk */
const MEDAL: Record<number, string> = {
  1: "from-gold-300 to-gold-500 text-navy-950",
  2: "from-slate-100 to-slate-300 text-navy-900",
  3: "from-[#f0c29b] to-[#b8743f] text-navy-950",
};

/**
 * Advokat kartasi (mobile-first): telefonda ixcham — butun karta bosiladi, alohida tugmasiz;
 * katta ekranlarda toʻliq maʼlumot va “Profilni koʻrish” tugmasi.
 */
export async function LawyerCard({
  lawyer,
  place,
  stacked,
  className,
}: {
  lawyer: LawyerCardData;
  place?: number;
  /** Tor ustunlar (bosh sahifadagi 5 talik reyting) uchun: katta ekranda rasm ism ustida */
  stacked?: boolean;
  className?: string;
}) {
  const [t, tl, locale] = await Promise.all([getTranslations("common"), getTranslations("lang"), getLocale()]);
  const specs = lawyer.specializations.map((s) => s.specialization);
  const placeName = [lname(lawyer.region, locale), lawyer.district && lname(lawyer.district, locale)].filter(Boolean).join(", ");

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col p-4 transition duration-300 active:bg-navy-50/50 sm:p-5 sm:hover:-translate-y-1 sm:hover:border-brand-200 sm:hover:shadow-lift",
        place === 1 && "border-brand-300 bg-gradient-to-b from-brand-50 to-white ring-1 ring-brand-200",
        className,
      )}
    >
      {place && (
        <span
          className={cn(
            "absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-b px-2.5 py-1 text-xs font-bold shadow-soft ring-2 ring-white sm:left-5",
            MEDAL[place] ?? "from-navy-700 to-navy-900 text-white",
          )}
        >
          <Award className="size-3.5" aria-hidden /> #{place}
        </span>
      )}
      <div className={cn("flex gap-3 sm:gap-4", stacked && "sm:mt-1 sm:flex-col sm:gap-3")}>
        <Avatar name={lawyer.fullName} src={lawyer.avatarUrl} className="size-14 shrink-0 text-lg shadow-soft ring-2 ring-white sm:size-16 sm:text-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug text-navy-900">
            {/* after:inset-0 — butun karta bosiladigan maydon (telefonda katta nishon) */}
            <Link href={`/advokat/${lawyer.slug}`} className="after:absolute after:inset-0 after:rounded-2xl sm:hover:text-brand-700">
              {lawyer.fullName}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <RatingStars value={lawyer.rating} />
              <span className="font-semibold text-navy-900">{lawyer.rating > 0 ? lawyer.rating.toFixed(1) : "—"}</span>
              <span className="whitespace-nowrap text-slate-500">({t("reviews", { count: lawyer.reviewCount })})</span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {lawyer.licenseVerified && (
              <Badge variant="brand">
                <BadgeCheck className="size-3.5" /> {t("verified")}
              </Badge>
            )}
            {lawyer.isOnDuty && <Badge variant="gold">{t("onDuty")}</Badge>}
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 self-center text-slate-300 sm:hidden" aria-hidden />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
        {specs.slice(0, 2).map((s) => (
          <Badge key={s.id} variant="outline">
            {lname(s, locale)}
          </Badge>
        ))}
        {/* Katta ekranda uchinchi yoʻnalish ham koʻrsatiladi */}
        {specs[2] && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {lname(specs[2], locale)}
          </Badge>
        )}
        {specs.length > 2 && (
          <Badge variant="outline" className="sm:hidden">
            +{specs.length - 2}
          </Badge>
        )}
        {specs.length > 3 && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            +{specs.length - 3}
          </Badge>
        )}
      </div>

      {/* Telefonda bir qator: tajriba · hudud */}
      <p className="mt-3 flex items-center gap-1.5 truncate text-sm text-slate-600 sm:hidden">
        <MapPin className="size-4 shrink-0 text-navy-500" />
        <span className="truncate">
          {placeName} · {t("years", { count: lawyer.experienceYears })}
        </span>
      </p>

      <dl className="mt-4 hidden space-y-1.5 text-sm text-slate-600 sm:block">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-navy-500" />
          {t("experience", { years: t("years", { count: lawyer.experienceYears }) })}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-navy-500" />
          {placeName}
        </div>
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-navy-500" />
          {lawyer.languages.map((l) => (tl.has(l as "uz") ? tl(l as "uz") : l)).join(", ")}
        </div>
      </dl>

      <div className="mt-auto hidden pt-5 sm:block">
        <span className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>{t("viewProfile")}</span>
      </div>
    </Card>
  );
}
