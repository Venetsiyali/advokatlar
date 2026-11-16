import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { ADMIN_PAGE_SIZE, pageParam } from "@/server/admin";
import { deleteArticleAction } from "@/server/admin-actions";
import { ActionButton } from "@/components/forms/action-button";
import { buttonVariants } from "@/components/ui/button";
import { EmptyRow, PageTitle, Pager, Pill, Table, Td } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const LOCALE_LABEL = { uz: "UZ", uz_Cyrl: "ЎЗ", ru: "RU" } as const;

export default async function AdminArticles({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = pageParam((await searchParams).page);
  const [t, format, rows, total] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    prisma.article.findMany({ orderBy: { updatedAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
    prisma.article.count(),
  ]);

  return (
    <>
      <PageTitle title={t("nav.articles")}>
        <Link href="/admin/maqolalar/yangi" className={buttonVariants({ size: "sm" })}>
          <Plus /> {t("article.new")}
        </Link>
      </PageTitle>
      <Table head={[t("cols.title"), t("cols.locale"), t("cols.status"), t("cols.updated"), ""]}>
        {rows.length === 0 && <EmptyRow cols={5} text={t("empty")} />}
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-navy-50/40">
            <Td>
              <Link href={`/admin/maqolalar/${a.id}`} className="font-semibold hover:text-brand-700 hover:underline">
                {a.title}
              </Link>
              <div className="font-mono text-xs text-slate-400">/maqolalar/{a.slug}</div>
            </Td>
            <Td>{LOCALE_LABEL[a.locale]}</Td>
            <Td>
              {a.published ? <Pill value="TASDIQLANGAN">{t("cols.published")}</Pill> : <Pill value="BEKOR">{t("article.draft")}</Pill>}
            </Td>
            <Td className="whitespace-nowrap text-slate-500">{format.dateTime(a.updatedAt, { dateStyle: "short", timeStyle: "short" })}</Td>
            <Td className="text-right">
              <ActionButton
                run={deleteArticleAction.bind(null, a.id)}
                label={t("article.delete")}
                confirmText={t("article.confirmDelete")}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
              />
            </Td>
          </tr>
        ))}
      </Table>
      <Pager pathname="/admin/maqolalar" query={{}} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
