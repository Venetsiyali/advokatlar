import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, Banknote, FileCheck2, Inbox, MessageSquareText, ShieldCheck, UserRound, Users, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getAdminStats } from "@/server/admin";
import { EmptyRow, PageTitle, Table, Td } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, format, stats, logs] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
    getFormatter(),
    getAdminStats(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true, phone: true } } } }),
  ]);

  const cards = [
    { key: "pendingLawyers", value: stats.pendingLawyers, icon: FileCheck2, href: "/admin/advokatlar?holat=KUTILMOQDA", alert: stats.pendingLawyers > 0 },
    { key: "stuckRequests", value: stats.stuckRequests, icon: AlertTriangle, href: "/admin/murojaatlar?holat=signal", alert: stats.stuckRequests > 0 },
    { key: "pendingReviews", value: stats.pendingReviews, icon: MessageSquareText, href: "/admin/izohlar", alert: stats.pendingReviews > 0 },
    { key: "openRequests", value: stats.openRequests, icon: Inbox, href: "/admin/murojaatlar?holat=ochiq" },
    { key: "requests24h", value: stats.requests24h, icon: Zap, href: "/admin/murojaatlar" },
    { key: "approvedLawyers", value: stats.approvedLawyers, icon: ShieldCheck, href: "/admin/advokatlar?holat=TASDIQLANGAN" },
    { key: "activeSubs", value: stats.activeSubs, icon: UserRound, href: "/admin/advokatlar" },
    { key: "users", value: stats.users, icon: Users, href: "/admin/foydalanuvchilar" },
  ] as const;
  const revenue = format.number(stats.revenueMonth);

  return (
    <>
      <PageTitle title={t("nav.dashboard")} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className={cn(
              "rounded-2xl border bg-white p-4 shadow-soft transition hover:-translate-y-0.5",
              "alert" in c && c.alert ? "border-amber-300" : "border-navy-100/70",
            )}
          >
            <c.icon className={cn("size-5", "alert" in c && c.alert ? "text-amber-600" : "text-brand-600")} />
            <div className="mt-3 text-2xl font-extrabold text-navy-900">{format.number(c.value)}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">{t(`stats.${c.key}`)}</div>
          </Link>
        ))}
      </div>

      <Link
        href="/admin/tolovlar?holat=TOLANDI"
        className="mt-3 flex items-center gap-4 rounded-2xl border border-navy-100/70 bg-navy-900 p-4 text-white shadow-soft transition hover:-translate-y-0.5"
      >
        <Banknote className="size-6 text-brand-400" />
        <div>
          <div className="text-2xl font-extrabold">{tc("sum", { amount: revenue })}</div>
          <div className="text-xs font-medium text-navy-200">{t("stats.revenueMonth")}</div>
        </div>
      </Link>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h3 className="font-bold text-navy-900">{t("recentActivity")}</h3>
        <Link href="/admin/jurnal" className="text-sm font-semibold text-brand-700 hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <Table head={[t("cols.time"), t("cols.actor"), t("cols.action"), t("cols.entity")]}>
        {logs.length === 0 && <EmptyRow cols={4} text={t("empty")} />}
        {logs.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap text-slate-500">{format.dateTime(l.createdAt, { dateStyle: "short", timeStyle: "short" })}</Td>
            <Td>{l.actor?.name || l.actor?.phone || "—"}</Td>
            <Td>
              <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">{l.action}</code>
            </Td>
            <Td className="text-slate-500">
              {l.entity}
              {l.entityId && <span className="ml-1 text-xs opacity-70">#{l.entityId.slice(-8)}</span>}
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
