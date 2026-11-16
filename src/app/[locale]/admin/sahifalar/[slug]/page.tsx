import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { STATIC_SLUGS, type StaticSlug } from "@/lib/static-pages";
import { PageTitle, Section } from "@/components/admin/ui";
import { StaticPageForm } from "./page-form";

export default async function EditStaticPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!(STATIC_SLUGS as readonly string[]).includes(slug)) notFound();
  const [t, p] = await Promise.all([getTranslations("admin"), prisma.staticPage.findUnique({ where: { slug } })]);
  return (
    <>
      <Link href="/admin/sahifalar" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageTitle title={`${t("page.edit")}: /${slug}`}>
        <Link href={`/${slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          {t("article.view")} <ExternalLink className="size-3.5" />
        </Link>
      </PageTitle>
      <Section>
        <StaticPageForm
          page={{
            slug: slug as StaticSlug,
            titleUz: p?.titleUz ?? "",
            titleUzCyrl: p?.titleUzCyrl ?? "",
            titleRu: p?.titleRu ?? "",
            contentUz: p?.contentUz ?? "",
            contentUzCyrl: p?.contentUzCyrl ?? "",
            contentRu: p?.contentRu ?? "",
          }}
        />
      </Section>
    </>
  );
}
