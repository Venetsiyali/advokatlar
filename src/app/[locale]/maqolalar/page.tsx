import type { Metadata } from "next";
import type { Locale, Prisma } from "@prisma/client";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { articleText } from "@/lib/localized";
import { readingMinutes } from "@/lib/sanitize";
import { alternates } from "@/lib/seo";
import { PageHeader } from "@/components/site/page-header";
import { Pager } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

/** Joriy til uchun maqolalar: rus sahifada — ruscha, oʻzbek (lotin/kirill) sahifada — oʻzbekcha */
function articleLocaleWhere(locale: string): Prisma.ArticleWhereInput {
  const langs: Locale[] = locale === "ru" ? ["ru"] : ["uz", "uz_Cyrl"];
  return { published: true, locale: { in: langs } };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "articles" });
  return { title: t("title"), description: t("metaDescription"), alternates: alternates(locale, "/maqolalar") };
}

export default async function ArticlesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = Math.max(1, Number((await searchParams).page) || 1);

  let where = articleLocaleWhere(locale);
  // Tanlangan tilda maqola boʻlmasa — barcha eʼlon qilinganlar
  if ((await prisma.article.count({ where })) === 0) where = { published: true };

  const [t, format, rows, total] = await Promise.all([
    getTranslations("articles"),
    getFormatter(),
    prisma.article.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.article.count({ where }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader locale={locale} path="/maqolalar" title={t("title")} lead={t("lead")} />
      {rows.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-navy-50 p-10 text-center text-slate-600">{t("empty")}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => {
            const txt = articleText(a, locale);
            return (
              <Link
                key={a.id}
                href={`/maqolalar/${a.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                {a.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="aspect-[16/9] w-full bg-gradient-to-br from-navy-800 to-brand-700" aria-hidden />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {a.publishedAt && <time dateTime={a.publishedAt.toISOString()}>{format.dateTime(a.publishedAt, { dateStyle: "medium" })}</time>}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {t("minutes", { count: readingMinutes(a.content) })}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold leading-snug text-navy-900 group-hover:text-brand-700">{txt.title}</h2>
                  {txt.excerpt && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{txt.excerpt}</p>}
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-700">
                    {t("readMore")} <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Pager pathname="/maqolalar" query={{}} page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
