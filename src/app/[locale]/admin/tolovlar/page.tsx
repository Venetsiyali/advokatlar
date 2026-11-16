import type { PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatUzs } from "@/lib/utils";
import { ADMIN_PAGE_SIZE, pageParam, strParam } from "@/server/admin";
import { EmptyRow, FilterTabs, PageTitle, Pager, Pill, Table, Td } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const STATUSES: PaymentStatus[] = ["TOLANDI", "KUTILMOQDA", "BEKOR", "XATO"];
const PROVIDERS: PaymentProvider[] = ["PAYME", "CLICK", "MANUAL"];
const PILL: Record<PaymentStatus, string> = { TOLANDI: "FAOL", KUTILMOQDA: "KUTILMOQDA", BEKOR: "BEKOR", XATO: "RAD" };
type SP = Record<string, string | string[] | undefined>;

export default async function AdminPayments({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const holatRaw = strParam(sp.holat);
  const holat = (STATUSES as string[]).includes(holatRaw) ? (holatRaw as PaymentStatus) : "";
  const tizimRaw = strParam(sp.tizim);
  const tizim = (PROVIDERS as string[]).includes(tizimRaw) ? (tizimRaw as PaymentProvider) : "";
  const page = pageParam(sp.page);
  const where: Prisma.PaymentWhereInput = { ...(holat && { status: holat }), ...(tizim && { provider: tizim }) };

  const [t, tp, format, rows, total, sum] = await Promise.all([
    getTranslations("admin"),
    getTranslations("subscriptionPage"),
    getFormatter(),
    prisma.payment.findMany({
      where,
      include: { lawyer: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { ...where, status: "TOLANDI" }, _sum: { amountUzs: true } }),
  ]);
  const query = { holat, tizim };

  return (
    <>
      <PageTitle title={t("nav.payments")} />
      <FilterTabs
        pathname="/admin/tolovlar"
        query={query}
        param="holat"
        value={holat}
        options={[{ value: "", label: t("all") }, ...STATUSES.map((s) => ({ value: s, label: tp(`payStatus.${s}`) }))]}
      />
      <FilterTabs
        pathname="/admin/tolovlar"
        query={query}
        param="tizim"
        value={tizim}
        options={[{ value: "", label: t("all") }, ...PROVIDERS.map((p) => ({ value: p, label: t(`payment.provider.${p}`) }))]}
      />
      <p className="mb-3 text-sm font-semibold text-navy-800">{t("payment.total", { amount: formatUzs(sum._sum.amountUzs ?? 0) })}</p>
      <Table head={[t("cols.created"), t("cols.lawyer"), t("cols.provider"), t("cols.amount"), t("cols.status"), t("cols.paidAt"), t("payment.external")]}>
        {rows.length === 0 && <EmptyRow cols={7} text={t("empty")} />}
        {rows.map((p) => (
          <tr key={p.id}>
            <Td className="whitespace-nowrap text-slate-500">{format.dateTime(p.createdAt, { dateStyle: "short", timeStyle: "short" })}</Td>
            <Td>
              <Link href={`/admin/advokatlar/${p.lawyer.id}`} className="font-medium hover:underline">
                {p.lawyer.fullName || "—"}
              </Link>
            </Td>
            <Td>{t(`payment.provider.${p.provider}`)}</Td>
            <Td className="whitespace-nowrap font-semibold">{formatUzs(p.amountUzs)}</Td>
            <Td>
              <Pill value={PILL[p.status]}>{tp(`payStatus.${p.status}`)}</Pill>
            </Td>
            <Td className="whitespace-nowrap text-slate-500">{p.paidAt ? format.dateTime(p.paidAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</Td>
            <Td className="max-w-[160px] truncate font-mono text-xs text-slate-500">{p.externalId ?? "—"}</Td>
          </tr>
        ))}
      </Table>
      <Pager pathname="/admin/tolovlar" query={query} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
