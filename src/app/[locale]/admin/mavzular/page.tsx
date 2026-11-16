import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { deleteTopicAction } from "@/server/admin-actions";
import { ActionButton } from "@/components/forms/action-button";
import { buttonVariants } from "@/components/ui/button";
import { EmptyRow, PageTitle, Pill, Table, Td } from "@/components/admin/ui";

export default async function AdminTopics({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, loc, rows] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    prisma.topicPage.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }], include: { specialization: true } }),
  ]);

  return (
    <>
      <PageTitle title={t("nav.topics")}>
        <Link href="/admin/mavzular/yangi" className={buttonVariants({ size: "sm" })}>
          <Plus /> {t("topic.new")}
        </Link>
      </PageTitle>
      <Table head={[t("cols.order"), t("cols.title"), t("cols.spec"), t("cols.status"), t("cols.home"), ""]}>
        {rows.length === 0 && <EmptyRow cols={6} text={t("empty")} />}
        {rows.map((tp) => (
          <tr key={tp.id} className="hover:bg-navy-50/40">
            <Td className="text-slate-500">{tp.sortOrder}</Td>
            <Td>
              <Link href={`/admin/mavzular/${tp.id}`} className="font-semibold hover:text-brand-700 hover:underline">
                {tp.title}
              </Link>
              <div className="font-mono text-xs text-slate-400">/mavzu/{tp.slug}</div>
            </Td>
            <Td>{lname(tp.specialization, loc) || "—"}</Td>
            <Td>{tp.published ? <Pill value="TASDIQLANGAN">{t("cols.published")}</Pill> : <Pill value="BEKOR">{t("article.draft")}</Pill>}</Td>
            <Td>{tp.showOnHome ? t("yes") : t("no")}</Td>
            <Td className="text-right">
              <ActionButton
                run={deleteTopicAction.bind(null, tp.id)}
                label={t("topic.delete")}
                confirmText={t("topic.confirmDelete")}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
              />
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
