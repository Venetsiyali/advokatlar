import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { getCurrentUser, type CurrentUser } from "@/server/session";
import { cancelRequestAction, toggleDutyAction } from "@/server/cabinet-actions";
import { ActionButton } from "@/components/forms/action-button";
import { TelegramLink } from "./telegram-link";
import { StatusBadge } from "./status-badge";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

export default async function CabinetHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  // Layout kirmagan foydalanuvchini yoʻnaltiradi; sahifa parallel render qilinadi — shuning uchun tekshiruv
  if (!user) return null;
  return user.role === "LAWYER" && user.lawyerProfile ? <LawyerOverview user={user} /> : <ClientRequests user={user} />;
}

async function LawyerOverview({ user }: { user: CurrentUser }) {
  const lawyer = user.lawyerProfile!;
  const [t, ts, format, sub, counts] = await Promise.all([
    getTranslations("cabinet"),
    getTranslations("status"),
    getFormatter(),
    prisma.subscription.findUnique({ where: { lawyerId: lawyer.id } }),
    prisma.requestAssignment.groupBy({ by: ["status"], where: { lawyerId: lawyer.id }, _count: true }),
  ]);
  const closed = await prisma.request.count({ where: { assignedLawyerId: lawyer.id, status: "YOPILDI" } });
  const received = counts.reduce((a, c) => a + c._count, 0);
  const accepted = counts.find((c) => c.status === "QABUL_QILDI")?._count ?? 0;
  const subActive = sub && ["SINOV", "FAOL"].includes(sub.status) && sub.endsAt > new Date();

  const verification = {
    KUTILMOQDA: { kind: "warn", text: t("verificationPending") },
    RAD: { kind: "warn", text: t("verificationRejected", { reason: lawyer.rejectReason ?? "—" }) },
    TASDIQLANGAN: { kind: "ok", text: t("verificationOk") },
    BLOK: { kind: "warn", text: t("verificationBlocked") },
  }[lawyer.status];

  return (
    <div className="space-y-6">
      <Card className={`flex gap-3 p-5 ${verification.kind === "ok" ? "border-brand-100 bg-brand-50/50" : "border-amber-200 bg-amber-50/60"}`}>
        {verification.kind === "ok" ? <CheckCircle2 className="size-5 shrink-0 text-brand-600" /> : <AlertTriangle className="size-5 shrink-0 text-amber-600" />}
        <div>
          <p className="font-semibold">
            {t("verification")}: {ts(lawyer.status)}
          </p>
          <p className="mt-1 text-sm text-slate-700">{verification.text}</p>
          {lawyer.status !== "TASDIQLANGAN" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/kabinet/profil" className={buttonVariants({ size: "sm", variant: "outline" })}>
                {t("profile")}
              </Link>
              <Link href="/kabinet/hujjatlar" className={buttonVariants({ size: "sm", variant: "outline" })}>
                {t("documents")}
              </Link>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("stats.received"), received],
          [t("stats.accepted"), accepted],
          [t("stats.closed"), closed],
          [t("stats.rating"), lawyer.reviewCount ? lawyer.rating.toFixed(1) : "—"],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-2xl font-extrabold">{value}</p>
            <p className="mt-1 text-xs text-slate-600">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t("onDuty")}</p>
              <p className="mt-1 text-sm text-slate-600">{t("onDutyHint")}</p>
            </div>
            <ActionButton
              run={toggleDutyAction}
              variant={lawyer.isOnDuty ? "primary" : "outline"}
              size="sm"
              label={lawyer.isOnDuty ? t("on") : t("off")}
              aria-pressed={lawyer.isOnDuty}
            />
          </div>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Clock className="size-4" /> {t("subscription")}
          </p>
          {sub && (
            <p className="mt-1 text-sm text-slate-700">
              {t("subscriptionUntil", { status: ts(sub.status), date: format.dateTime(sub.endsAt, { dateStyle: "medium" }) })}
            </p>
          )}
          {!subActive && <p className="mt-2 text-sm font-medium text-amber-700">{t("subscriptionExpired")}</p>}
        </Card>
      </div>

      <Card className="p-5">
        <p className="flex items-center gap-2 font-semibold">
          <Send className="size-4" /> {t("telegramLink")}
        </p>
        {user.telegramId ? (
          <p className="mt-1 text-sm text-brand-700">{t("telegramLinked")}</p>
        ) : (
          <TelegramLink bot={process.env.NEXT_PUBLIC_TELEGRAM_BOT || "advokatkerak_bot"} />
        )}
      </Card>
    </div>
  );
}

async function ClientRequests({ user }: { user: CurrentUser }) {
  const [t, locale, format] = await Promise.all([getTranslations("cabinet"), getLocale(), getFormatter()]);
  const requests = await prisma.request.findMany({
    where: { OR: [{ clientId: user.id }, ...(user.phone ? [{ phone: user.phone }] : [])] },
    orderBy: { createdAt: "desc" },
    include: { specialization: true, region: true, assignedLawyer: { select: { fullName: true, slug: true } }, review: { select: { id: true } } },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("myRequests")}</h2>
        <Link href="/murojaat" className={buttonVariants({ size: "sm" })}>
          {t("newRequest")}
        </Link>
      </div>
      {requests.length === 0 && <Card className="p-8 text-center text-slate-500">{t("noRequests")}</Card>}
      {requests.map((r) => (
        <Card key={r.id} className="p-5" data-testid="client-request">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold">{r.code}</span>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {lname(r.specialization, locale)} · {lname(r.region, locale)} · {format.dateTime(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="mt-2 line-clamp-3 text-sm text-slate-700">{r.description}</p>
          {r.assignedLawyer && (
            <p className="mt-3 text-sm">
              {t("lawyer")}:{" "}
              <Link href={`/advokat/${r.assignedLawyer.slug}`} className="font-semibold text-brand-700 hover:underline">
                {r.assignedLawyer.fullName}
              </Link>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {["YANGI", "YUBORILDI", "QABUL_QILINDI"].includes(r.status) && r.clientId === user.id && (
              <ActionButton run={cancelRequestAction.bind(null, r.id)} label={t("cancel")} confirmText={t("cancelConfirm")} variant="outline" size="sm" />
            )}
            {r.status === "YOPILDI" && r.reviewToken && !r.review && (
              <Link href={`/baho/${r.reviewToken}`} className={buttonVariants({ size: "sm" })}>
                {t("leaveReview")}
              </Link>
            )}
            {r.review && <Badge variant="brand">{t("reviewed")}</Badge>}
          </div>
        </Card>
      ))}
    </div>
  );
}
