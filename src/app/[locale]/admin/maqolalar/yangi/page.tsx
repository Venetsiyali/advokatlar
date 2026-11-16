import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageTitle, Section } from "@/components/admin/ui";
import { ArticleForm } from "../article-form";

export default async function NewArticle({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <Link href="/admin/maqolalar" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageTitle title={t("article.new")} />
      <Section>
        <ArticleForm article={{ title: "", slug: "", locale: "uz", excerpt: "", content: "", coverUrl: null, published: false }} />
      </Section>
    </>
  );
}
