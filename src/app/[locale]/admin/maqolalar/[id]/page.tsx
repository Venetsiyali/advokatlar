import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { PageTitle, Section } from "@/components/admin/ui";
import { ArticleForm } from "../article-form";

export default async function EditArticle({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) notFound();
  const t = await getTranslations("admin");
  return (
    <>
      <Link href="/admin/maqolalar" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageTitle title={t("article.edit")}>
        {a.published && (
          <Link href={`/maqolalar/${a.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            {t("article.view")} <ExternalLink className="size-3.5" />
          </Link>
        )}
      </PageTitle>
      <Section>
        <ArticleForm
          article={{
            id: a.id,
            title: a.title,
            slug: a.slug,
            locale: a.locale,
            excerpt: a.excerpt ?? "",
            content: a.content,
            coverUrl: a.coverUrl,
            published: a.published,
          }}
        />
      </Section>
    </>
  );
}
