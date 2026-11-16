import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ADMIN_PAGE_SIZE, pageParam, strParam } from "@/server/admin";
import { EmptyRow, PageTitle, Pager, SearchForm, Table, Td } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function AdminAudit({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = strParam(sp.q);
  const page = pageParam(sp.page);
  const size = ADMIN_PAGE_SIZE * 2;
  const where = q ? { OR: [{ action: { contains: q } }, { entity: { contains: q } }, { entityId: q }] } : {};

  const [t, format, rows, total] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <>
      <PageTitle title={t("nav.audit")} />
      <SearchForm q={q} placeholder={`${t("cols.action")} / ${t("cols.entity")} / ID`} />
      <Table head={[t("cols.time"), t("cols.actor"), t("cols.action"), t("cols.entity"), t("cols.details")]}>
        {rows.length === 0 && <EmptyRow cols={5} text={t("empty")} />}
        {rows.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap text-slate-500">{format.dateTime(l.createdAt, { dateStyle: "short", timeStyle: "medium" })}</Td>
            <Td>{l.actor?.name || l.actor?.phone || "—"}</Td>
            <Td>
              <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">{l.action}</code>
            </Td>
            <Td className="text-xs text-slate-500">
              {l.entity}
              {l.entityId && <div className="font-mono">{l.entityId}</div>}
            </Td>
            <Td>
              {l.meta != null && <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-600">{JSON.stringify(l.meta)}</pre>}
            </Td>
          </tr>
        ))}
      </Table>
      <Pager pathname="/admin/jurnal" query={{ q }} page={page} total={total} pageSize={size} />
    </>
  );
}
