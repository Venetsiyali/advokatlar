import type { Prisma, RequestStatus } from "@prisma/client";
import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { formatPhone } from "@/lib/phone";
import { ADMIN_PAGE_SIZE, pageParam, strParam } from "@/server/admin";
import { EmptyRow, FilterTabs, PageTitle, Pager, SearchForm, Table, Td } from "@/components/admin/ui";
import { StatusBadge } from "../../kabinet/status-badge";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const CLOSED: RequestStatus[] = ["QABUL_QILINDI", "JARAYONDA", "YOPILDI", "BEKOR_QILINDI"];

export default async function AdminRequests({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = strParam(sp.q);
  const holat = strParam(sp.holat);
  const page = pageParam(sp.page);

  const statusWhere: Prisma.RequestWhereInput =
    holat === "ochiq"
      ? { status: { in: ["YANGI", "YUBORILDI"] } }
      : holat === "signal"
        ? { status: { in: ["YANGI", "YUBORILDI"] }, adminAlertedAt: { not: null } }
        : (CLOSED as string[]).includes(holat)
          ? { status: holat as RequestStatus }
          : {};
  const digits = q.replace(/\D/g, "");
  const where: Prisma.RequestWhereInput = {
    ...statusWhere,
    ...(q && {
      OR: [
        { code: { contains: q.toUpperCase() } },
        { name: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ],
    }),
  };

  const [t, ts, format, loc, rows, total, open, stuck] = await Promise.all([
    getTranslations("admin"),
    getTranslations("status"),
    getFormatter(),
    getLocale(),
    prisma.request.findMany({
      where,
      include: { region: true, specialization: true, assignedLawyer: { select: { fullName: true } }, _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.request.count({ where }),
    prisma.request.count({ where: { status: { in: ["YANGI", "YUBORILDI"] } } }),
    prisma.request.count({ where: { status: { in: ["YANGI", "YUBORILDI"] }, adminAlertedAt: { not: null } } }),
  ]);
  const query = { q, holat };

  return (
    <>
      <PageTitle title={t("nav.requests")} />
      <FilterTabs
        pathname="/admin/murojaatlar"
        query={query}
        param="holat"
        value={holat}
        options={[
          { value: "", label: t("all") },
          { value: "ochiq", label: ts("YUBORILDI"), count: open },
          { value: "signal", label: t("stats.stuckRequests"), count: stuck },
          ...CLOSED.map((s) => ({ value: s, label: ts(s) })),
        ]}
      />
      <SearchForm q={q} placeholder={t("searchRequests")} hidden={{ holat }} />
      <Table head={[t("cols.code"), t("cols.client"), t("cols.spec"), t("cols.region"), t("cols.status"), t("cols.lawyer"), t("cols.created")]}>
        {rows.length === 0 && <EmptyRow cols={7} text={t("empty")} />}
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-navy-50/40">
            <Td className="whitespace-nowrap">
              <Link href={`/admin/murojaatlar/${r.id}`} className="font-mono font-semibold text-navy-900 hover:text-brand-700 hover:underline">
                {r.code}
              </Link>
              {r.adminAlertedAt && ["YANGI", "YUBORILDI"].includes(r.status) && (
                <AlertTriangle className="ml-1.5 inline size-3.5 text-amber-600" aria-label={t("stats.stuckRequests")} />
              )}
            </Td>
            <Td>
              <div className="font-medium">{r.name}</div>
              <div className="whitespace-nowrap text-xs text-slate-500">{formatPhone(r.phone)}</div>
            </Td>
            <Td>{lname(r.specialization, loc)}</Td>
            <Td>{lname(r.region, loc)}</Td>
            <Td>
              <StatusBadge status={r.status} />
              {r._count.assignments > 0 && <div className="mt-1 text-xs text-slate-400">{t("request.round", { round: r.dispatchRound })} · {r._count.assignments}</div>}
            </Td>
            <Td>{r.assignedLawyer?.fullName ?? "—"}</Td>
            <Td className="whitespace-nowrap text-slate-500">{format.dateTime(r.createdAt, { dateStyle: "short", timeStyle: "short" })}</Td>
          </tr>
        ))}
      </Table>
      <Pager pathname="/admin/murojaatlar" query={query} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
