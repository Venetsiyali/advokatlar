import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, Briefcase, ChevronRight, Languages, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RatingStars } from "./rating-stars";
import { Avatar } from "./avatar";
import { lname } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { LawyerCardData } from "@/server/lawyers";

/**
 * Advokat kartasi (mobile-first): telefonda ixcham — butun karta bosiladi, alohida tugmasiz;
 * katta ekranlarda toʻliq maʼlumot va “Profilni koʻrish” tugmasi.
 */
export async function LawyerCard({ lawyer, place, className }: { lawyer: LawyerCardData; place?: number; className?: string }) {
  const [t, tl, locale] = await Promise.all([getTranslations("common"), getTranslations("lang"), getLocale()]);
  const specs = lawyer.specializations.map((s) => s.specialization);
  const placeName = [lname(lawyer.region, locale), lawyer.district && lname(lawyer.district, locale)].filter(Boolean).join(", ");

  return (
    <Card className={cn("group relative flex h-full flex-col p-4 transition-shadow active:bg-navy-50/50 sm:p-5 sm:hover:shadow-lift", className)}>
      {place && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-soft sm:-top-3 sm:left-5 sm:px-3 sm:py-1">
          #{place}
        </span>
      )}
      <div className="flex gap-3 sm:gap-4">
        <Avatar name={lawyer.fullName} src={lawyer.avatarUrl} className="size-14 shrink-0 text-lg sm:size-16 sm:text-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug text-navy-900">
            {/* after:inset-0 — butun karta bosiladigan maydon (telefonda katta nishon) */}
            <Link href={`/advokat/${lawyer.slug}`} className="after:absolute after:inset-0 after:rounded-2xl sm:hover:text-brand-700">
              {lawyer.fullName}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
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
