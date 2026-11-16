import type { Prisma } from "@prisma/client";
import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { formatPhone } from "@/lib/phone";
import { ADMIN_PAGE_SIZE, pageParam, strParam } from "@/server/admin";
import { EmptyRow, FilterTabs, PageTitle, Pager, Pill, SearchForm, Table, Td } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const STATUSES = ["KUTILMOQDA", "TASDIQLANGAN", "RAD", "BLOK"] as const;
type SP = Record<string, string | string[] | undefined>;

export default async function AdminLawyers({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = strParam(sp.q);
  const holatRaw = strParam(sp.holat);
  const holat = (STATUSES as readonly string[]).includes(holatRaw) ? (holatRaw as (typeof STATUSES)[number]) : "";
  const page = pageParam(sp.page);

  const digits = q.replace(/\D/g, "");
  const where: Prisma.LawyerProfileWhereInput = {
    ...(holat && { status: holat }),
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { licenseNumber: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ user: { phone: { contains: digits } } }] : []),
      ],
    }),
  };

  const [t, ts, format, loc, rows, total, counts] = await Promise.all([
    getTranslations("admin"),
    getTranslations("status"),
    getFormatter(),
    getLocale(),
    prisma.lawyerProfile.findMany({
      where,
      include: { user: { select: { phone: true, isBlocked: true } }, region: true, subscription: true },
      // Tekshiruv kutayotganlar birinchi — eng eskisi yuqorida
      orderBy: holat === "KUTILMOQDA" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.lawyerProfile.count({ where }),
    prisma.lawyerProfile.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const query = { q, holat };
  const now = new Date();

  return (
    <>
      <PageTitle title={t("nav.lawyers")} />
      <FilterTabs
        pathname="/admin/advokatlar"
        query={query}
        param="holat"
        value={holat}
        options={[
          { value: "", label: t("all"), count: counts.reduce((a, c) => a + c._count, 0) },
          ...STATUSES.map((s) => ({ value: s, label: t(`lawyerStatus.${s}`), count: count(s) })),
        ]}
      />
      <SearchForm q={q} placeholder={t("searchLawyers")} hidden={{ holat }} />
      <Table head={[t("cols.name"), t("cols.phone"), t("cols.region"), t("cols.status"), t("cols.subscription"), t("cols.rating"), t("cols.created")]}>
        {rows.length === 0 && <EmptyRow cols={7} text={t("empty")} />}
        {rows.map((l) => {
          const sub = l.subscription;
          const subActive = sub && ["SINOV", "FAOL"].includes(sub.status) && sub.endsAt > now;
          return (
            <tr key={l.id} className="hover:bg-navy-50/40">
              <Td>
                <Link href={`/admin/advokatlar/${l.id}`} className="font-semibold text-navy-900 hover:text-brand-700 hover:underline">
                  {l.fullName || "—"}
                </Link>
                {l.user.isBlocked && <span className="ml-2 text-xs font-semibold text-red-600">{t("user.blocked")}</span>}
              </Td>
              <Td className="whitespace-nowrap">{l.user.phone ? formatPhone(l.user.phone) : "—"}</Td>
              <Td>{lname(l.region, loc) || "—"}</Td>
              <Td>
                <Pill value={l.status}>{t(`lawyerStatus.${l.status}`)}</Pill>
              </Td>
              <Td className="whitespace-nowrap text-xs">
                {sub ? (
                  <span className={subActive ? "text-brand-700" : "text-red-600"}>
                    {ts(sub.status)} · {format.dateTime(sub.endsAt, { dateStyle: "short" })}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="whitespace-nowrap">
                {l.reviewCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {l.rating.toFixed(1)} <span className="text-xs text-slate-400">({l.reviewCount})</span>
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="whitespace-nowrap text-slate-500">{format.dateTime(l.createdAt, { dateStyle: "short" })}</Td>
            </tr>
          );
        })}
      </Table>
      <Pager pathname="/admin/advokatlar" query={query} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
