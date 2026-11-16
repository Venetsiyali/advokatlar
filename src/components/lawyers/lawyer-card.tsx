import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin, Languages, Briefcase } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RatingStars } from "./rating-stars";
import { Avatar } from "./avatar";
import { lname } from "@/lib/localized";
import type { LawyerCardData } from "@/server/lawyers";

export async function LawyerCard({ lawyer, place }: { lawyer: LawyerCardData; place?: number }) {
  const [t, tl, locale] = await Promise.all([getTranslations("common"), getTranslations("lang"), getLocale()]);
  const specs = lawyer.specializations.map((s) => s.specialization);
  return (
    <Card className="relative flex h-full flex-col p-5 transition-shadow hover:shadow-lift">
      {place && (
        <span className="absolute -top-3 left-5 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-white shadow-soft">
          #{place}
        </span>
      )}
      <div className="flex gap-4">
        <Avatar name={lawyer.fullName} src={lawyer.avatarUrl} className="size-16 shrink-0 text-xl" />
        <div className="min-w-0">
          <h3 className="font-bold leading-snug text-navy-900">
            <Link href={`/advokat/${lawyer.slug}`} className="after:absolute after:inset-0 hover:text-brand-700">
              {lawyer.fullName}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {lawyer.licenseVerified && (
              <Badge variant="brand">
                <BadgeCheck className="size-3.5" /> {t("verified")}
              </Badge>
            )}
            {lawyer.isOnDuty && <Badge variant="gold">{t("onDuty")}</Badge>}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <RatingStars value={lawyer.rating} />
            <span className="font-semibold text-navy-900">{lawyer.rating > 0 ? lawyer.rating.toFixed(1) : "—"}</span>
            <span className="text-slate-500">({t("reviews", { count: lawyer.reviewCount })})</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {specs.slice(0, 3).map((s) => (
          <Badge key={s.id} variant="outline">
            {lname(s, locale)}
          </Badge>
        ))}
        {specs.length > 3 && <Badge variant="outline">+{specs.length - 3}</Badge>}
      </div>

      <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-navy-500" />
          {t("experience", { years: t("years", { count: lawyer.experienceYears }) })}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-navy-500" />
          {[lname(lawyer.region, locale), lawyer.district && lname(lawyer.district, locale)].filter(Boolean).join(", ")}
        </div>
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-navy-500" />
          {lawyer.languages.map((l) => (tl.has(l) ? tl(l) : l)).join(", ")}
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <span className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>{t("viewProfile")}</span>
      </div>
    </Card>
  );
}
