import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Paperclip, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { formatPhone } from "@/lib/phone";
import { signedUrl } from "@/lib/storage";
import { adminCancelAction, adminRedispatchAction } from "@/server/admin-actions";
import { canTransition } from "@/lib/matching-core";
import { ActionButton } from "@/components/forms/action-button";
import { EmptyRow, KV, Pill, Section, Table, Td } from "@/components/admin/ui";
import { StatusBadge } from "../../../kabinet/status-badge";
import { AssignForm } from "./assign-form";

export default async function AdminRequest({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const r = await prisma.request.findUnique({
    where: { id },
    include: {
      region: true,
      district: true,
      specialization: true,
      client: { select: { id: true, telegramId: true } },
      assignedLawyer: { select: { id: true, fullName: true } },
      targetLawyer: { select: { id: true, fullName: true } },
      assignments: { include: { lawyer: { select: { id: true, fullName: true } } }, orderBy: [{ round: "asc" }, { sentAt: "asc" }] },
      review: true,
    },
  });
  if (!r) notFound();

  const open = ["YANGI", "YUBORILDI"].includes(r.status);
  const assignable = open || r.status === "QABUL_QILINDI" || r.status === "JARAYONDA";

  const [t, format, loc, attachmentUrl, lawyers] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    getLocale(),
    r.attachmentKey ? signedUrl(r.attachmentKey) : null,
    assignable
      ? prisma.lawyerProfile.findMany({
          where: { status: "TASDIQLANGAN", user: { isBlocked: false }, id: { not: r.assignedLawyerId ?? undefined } },
          select: {
            id: true,
            fullName: true,
            regionId: true,
            rating: true,
            region: true,
            specializations: { select: { specializationId: true } },
          },
          orderBy: [{ rating: "desc" }, { fullName: "asc" }],
          take: 500,
        })
      : [],
  ]);

  const toOpt = (l: (typeof lawyers)[number]) => ({ id: l.id, label: `${l.fullName} — ${lname(l.region, loc)}${l.rating ? ` · ★${l.rating.toFixed(1)}` : ""}` });
  const isMatch = (l: (typeof lawyers)[number]) => l.regionId === r.regionId && l.specializations.some((s) => s.specializationId === r.specializationId);
  const errors = {
    CLOSED: t("request.errors.CLOSED"),
    NO_LAWYERS: t("request.errors.NO_LAWYERS"),
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/murojaatlar" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-xl font-bold">{r.code}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <StatusBadge status={r.status} />
              <span>{t(`request.source.${r.source}`)}</span>
              <span>· {format.dateTime(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {open && <ActionButton run={adminRedispatchAction.bind(null, r.id)} label={t("request.redispatch")} variant="outline" size="sm" errors={errors} />}
            {canTransition(r.status, "BEKOR_QILINDI") && (
              <ActionButton
                run={adminCancelAction.bind(null, r.id)}
                label={t("request.cancel")}
                confirmText={t("request.confirmCancel")}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                errors={errors}
              />
            )}
          </div>
        </div>
        {r.adminAlertedAt && open && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="size-4" /> {t("request.alerted", { date: format.dateTime(r.adminAlertedAt, { dateStyle: "short", timeStyle: "short" }) })}
          </p>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Section>
            <dl>
              <KV k={t("cols.client")}>{r.name}</KV>
              <KV k={t("cols.phone")}>
                <a href={`tel:${r.phone}`} className="font-medium hover:underline">
                  {formatPhone(r.phone)}
                </a>
                <span className="ml-2 text-xs text-slate-500">{r.phoneVerified ? `✓ ${t("request.phoneVerified")}` : t("request.phoneNotVerified")}</span>
              </KV>
              <KV k={t("request.contactMethod")}>{r.contactMethod === "TELEGRAM" ? t("request.methodTelegram") : t("request.methodCall")}</KV>
              <KV k={t("cols.spec")}>{lname(r.specialization, loc)}</KV>
              <KV k={t("cols.region")}>{[lname(r.region, loc), lname(r.district, loc)].filter(Boolean).join(", ")}</KV>
              {r.targetLawyer && (
                <KV k={t("cols.lawyer")}>
                  <Link href={`/admin/advokatlar/${r.targetLawyer.id}`} className="hover:underline">
                    {r.targetLawyer.fullName}
                  </Link>
                </KV>
              )}
              <KV k={t("request.description")}>
                <span className="whitespace-pre-line">{r.description}</span>
              </KV>
              {attachmentUrl && (
                <KV k={t("request.attachment")}>
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                    <Paperclip className="size-3.5" /> {t("lawyer.open")}
                  </a>
                </KV>
              )}
            </dl>
          </Section>

          <div>
            <h3 className="mb-3 font-bold text-navy-900">{t("request.timeline")}</h3>
            <Table head={[t("cols.lawyer"), t("cols.round"), t("cols.status"), t("cols.time")]}>
              {r.assignments.length === 0 && <EmptyRow cols={4} text={t("request.noAssignments")} />}
              {r.assignments.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <Link href={`/admin/advokatlar/${a.lawyer.id}`} className="font-medium hover:underline">
                      {a.lawyer.fullName}
                    </Link>
                  </Td>
                  <Td>{a.round}</Td>
                  <Td>
                    <Pill value={a.status}>{t(`assignStatus.${a.status}`)}</Pill>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">
                    {format.dateTime(a.sentAt, { dateStyle: "short", timeStyle: "short" })}
                    {a.respondedAt && <> → {format.dateTime(a.respondedAt, { timeStyle: "short" })}</>}
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </div>

        <div className="space-y-5">
          <Section title={t("request.assignedTo")}>
            {r.assignedLawyer ? (
              <Link href={`/admin/advokatlar/${r.assignedLawyer.id}`} className="font-semibold text-navy-900 hover:underline">
                {r.assignedLawyer.fullName}
              </Link>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
            {assignable && (
              <div className="mt-4 border-t border-navy-50 pt-4">
                <h4 className="mb-3 text-sm font-semibold">{t("request.assign")}</h4>
                <AssignForm requestId={r.id} matching={lawyers.filter(isMatch).map(toOpt)} others={lawyers.filter((l) => !isMatch(l)).map(toOpt)} />
              </div>
            )}
          </Section>

          {r.review && (
            <Section title={t("request.review")}>
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`size-4 ${i < r.review!.rating ? "fill-amber-400" : "text-slate-200"}`} />
                ))}
                <span className="ml-2">
                  <Pill value={r.review.status}>{t(`reviewStatus.${r.review.status}`)}</Pill>
                </span>
              </div>
              {r.review.comment && <p className="mt-2 text-sm text-slate-700">{r.review.comment}</p>}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
