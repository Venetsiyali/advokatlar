import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { ltitle, topicSummary } from "@/lib/localized";
import { alternates } from "@/lib/seo";
import { TopicIcon } from "@/components/icons";
import { PageHeader } from "@/components/site/page-header";

/** ISR: sahifa keshlanadi; admin tahriri revalidatePath orqali darhol yangilaydi */
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "topics" });
  return { title: t("title"), description: t("metaDescription"), alternates: alternates(locale, "/mavzu") };
}

export default async function TopicsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, topics] = await Promise.all([
    getTranslations("topics"),
    prisma.topicPage.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader locale={locale} path="/mavzu" title={t("title")} lead={t("lead")} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((tp) => {
          const summary = topicSummary(tp, locale);
          return (
            <Link
              key={tp.id}
              href={`/mavzu/${tp.slug}`}
              className="group flex gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-lift"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <TopicIcon name={tp.icon} className="size-5" />
              </div>
              <div>
                <h2 className="font-bold text-navy-900 group-hover:text-brand-700">{ltitle(tp, locale)}</h2>
                {summary && <p className="mt-1 text-sm leading-relaxed text-slate-600">{summary}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
