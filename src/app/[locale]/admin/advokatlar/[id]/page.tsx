import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ExternalLink, FileText, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { formatPhone } from "@/lib/phone";
import { signedUrl } from "@/lib/storage";
import { approveLawyerAction, blockLawyerAction, setLicenseVerifiedAction } from "@/server/admin-actions";
import { ActionButton } from "@/components/forms/action-button";
import { Alert } from "@/components/forms/fields";
import { KV, Pill, Section } from "@/components/admin/ui";
import { Avatar } from "@/components/lawyers/avatar";
import { ExtendForm, RejectForm } from "./forms";

export default async function AdminLawyer({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const l = await prisma.lawyerProfile.findUnique({
    where: { id },
    include: {
      user: true,
      region: true,
      district: true,
      subscription: true,
      documents: { orderBy: { createdAt: "desc" } },
      specializations: { include: { specialization: true } },
    },
  });
  if (!l) notFound();

  const [t, ts, tc, td, tl, format, loc, sent, accepted, docs] = await Promise.all([
    getTranslations("admin"),
    getTranslations("status"),
    getTranslations("common"),
    getTranslations("documentsPage"),
    getTranslations("lang"),
    getFormatter(),
    getLocale(),
    prisma.requestAssignment.count({ where: { lawyerId: id } }),
    prisma.requestAssignment.count({ where: { lawyerId: id, status: "QABUL_QILDI" } }),
    Promise.all(l.documents.map(async (d) => ({ ...d, url: await signedUrl(d.storageKey) }))),
  ]);
  const errors = { INCOMPLETE: t("lawyer.incomplete"), NOT_FOUND: t("form.errors.NOT_FOUND") };
  const sub = l.subscription;

  return (
    <div className="space-y-5">
      <Link href="/admin/advokatlar" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <Section>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={l.fullName || "?"} src={l.avatarUrl} className="size-16 text-lg" />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              {l.fullName || "—"} {l.licenseVerified && <BadgeCheck className="size-5 text-brand-600" />}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Pill value={l.status}>{t(`lawyerStatus.${l.status}`)}</Pill>
              {l.user.isBlocked && <Pill value="BLOK">{t("user.blocked")}</Pill>}
              <span>{l.user.phone ? formatPhone(l.user.phone) : "—"}</span>
              <span className="inline-flex items-center gap-1">
                <Send className="size-3.5" /> {l.user.telegramId ? t("lawyer.telegramLinked") : t("lawyer.telegramNotLinked")}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {t("lawyer.requestsStat", { accepted, sent })}
              {l.avgResponseMins != null && <> · {t("lawyer.avgResponse", { mins: l.avgResponseMins })}</>}
            </p>
          </div>
          {l.status === "TASDIQLANGAN" && (
            <Link href={`/advokat/${l.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              {t("lawyer.openPublic")} <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      </Section>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Section title={t("lawyer.profile")}>
            <dl>
              <KV k={t("lawyer.license")}>
                {l.licenseNumber}
                {l.licenseVerified && <span className="ml-2 text-xs font-semibold text-brand-700">✓ {t("lawyer.licenseVerified")}</span>}
              </KV>
              <KV k={t("cols.region")}>{[lname(l.region, loc), lname(l.district, loc)].filter(Boolean).join(", ")}</KV>
              <KV k={t("lawyer.specs")}>{l.specializations.map((s) => lname(s.specialization, loc)).join(", ")}</KV>
              <KV k={t("lawyer.experience")}>{tc("years", { count: l.experienceYears })}</KV>
              <KV k={t("lawyer.languages")}>{l.languages.map((x) => (tl.has(x as "uz") ? tl(x as "uz") : x)).join(", ")}</KV>
              <KV k={t("lawyer.education")}>{l.education}</KV>
              <KV k={t("lawyer.workplace")}>{l.workplace}</KV>
              <KV k={t("lawyer.fee")}>{l.consultationFee ? tc("sum", { amount: format.number(l.consultationFee) }) : null}</KV>
              <KV k={t("lawyer.registered")}>{format.dateTime(l.createdAt, { dateStyle: "medium", timeStyle: "short" })}</KV>
              <KV k={t("lawyer.bio")}>
                <span className="whitespace-pre-line">{l.bio}</span>
              </KV>
            </dl>
          </Section>

          <Section title={t("lawyer.documents")}>
            {docs.length === 0 ? (
              <p className="text-sm text-slate-500">{t("lawyer.noDocuments")}</p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-slate-400" />
                      <span className="font-medium">{td(`types.${d.type}`)}</span>
                      <span className="truncate text-slate-500">{d.fileName}</span>
                    </span>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-semibold text-brand-700 hover:underline">
                      {t("lawyer.open")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={t("lawyer.moderation")}>
            {l.status === "RAD" && l.rejectReason && (
              <div className="mb-3">
                <Alert kind="info">{t("lawyer.rejectedWith", { reason: l.rejectReason })}</Alert>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {l.status !== "TASDIQLANGAN" && <ActionButton run={approveLawyerAction.bind(null, l.id)} label={t("lawyer.approve")} size="sm" errors={errors} />}
              {l.status !== "BLOK" && (
                <ActionButton
                  run={blockLawyerAction.bind(null, l.id)}
                  label={t("lawyer.block")}
                  confirmText={t("lawyer.confirmBlock")}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                />
              )}
              {l.licenseNumber && (
                <ActionButton
                  run={setLicenseVerifiedAction.bind(null, l.id, !l.licenseVerified)}
                  label={l.licenseVerified ? t("lawyer.licenseUnverify") : t("lawyer.licenseVerify")}
                  variant="outline"
                  size="sm"
                />
              )}
            </div>
            {l.status !== "RAD" && (
              <div className="mt-4 border-t border-navy-50 pt-4">
                <RejectForm lawyerId={l.id} />
              </div>
            )}
          </Section>

          <Section title={t("cols.subscription")}>
            <p className="mb-3 text-sm">
              {sub ? t("lawyer.subscriptionUntil", { status: ts(sub.status), date: format.dateTime(sub.endsAt, { dateStyle: "medium" }) }) : t("lawyer.noSubscription")}
            </p>
            <h4 className="mb-1 text-sm font-semibold">{t("lawyer.extend")}</h4>
            <p className="mb-3 text-xs text-slate-500">{t("lawyer.extendHint")}</p>
            <ExtendForm lawyerId={l.id} />
          </Section>
        </div>
      </div>
    </div>
  );
}
