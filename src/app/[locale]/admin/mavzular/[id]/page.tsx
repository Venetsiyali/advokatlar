import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { getSpecializations } from "@/server/lawyers";
import { PageTitle, Section } from "@/components/admin/ui";
import { TopicForm } from "../topic-form";

export default async function EditTopic({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const tp = await prisma.topicPage.findUnique({ where: { id } });
  if (!tp) notFound();
  const [t, loc, specs] = await Promise.all([getTranslations("admin"), getLocale(), getSpecializations()]);
  return (
    <>
      <Link href="/admin/mavzular" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageTitle title={t("topic.edit")}>
        {tp.published && (
          <Link href={`/mavzu/${tp.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            {t("article.view")} <ExternalLink className="size-3.5" />
          </Link>
        )}
      </PageTitle>
      <Section>
        <TopicForm
          specs={specs.map((s) => ({ id: s.id, name: lname(s, loc) }))}
          topic={{
            id: tp.id,
            slug: tp.slug,
            title: tp.title,
            titleUzCyrl: tp.titleUzCyrl ?? "",
            titleRu: tp.titleRu ?? "",
            summary: tp.summary ?? "",
            summaryRu: tp.summaryRu ?? "",
            content: tp.content,
            contentRu: tp.contentRu ?? "",
            icon: tp.icon ?? "",
            specializationId: tp.specializationId ?? "",
            sortOrder: tp.sortOrder,
            showOnHome: tp.showOnHome,
            published: tp.published,
          }}
        />
      </Section>
    </>
  );
}
