import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { articleText } from "@/lib/localized";
import { htmlToText, readingMinutes } from "@/lib/sanitize";
import { jsonLd, localeUrl } from "@/lib/seo";
import { site } from "@/lib/site";
import { buttonVariants } from "@/components/ui/button";
import { CtaBox, PageHeader } from "@/components/site/page-header";
import { articleParams } from "@/server/static-params";
import { ArticleCover } from "@/components/art/court-art";

/** ISR: sahifa keshlanadi; admin tahriri revalidatePath orqali darhol yangilaydi */
export const revalidate = 3600;

/** Build vaqtida mavjud yozuvlar oldindan tayyorlanadi; yangilari — birinchi soʻrovda (ISR) */
export function generateStaticParams() {
  return articleParams();
}

type Props = { params: Promise<{ locale: string; slug: string }> };

const getArticle = cache((slug: string) => prisma.article.findFirst({ where: { slug, published: true } }));

/** Maqola qaysi tilda yozilgan boʻlsa, oʻsha til(lar) uchun URL; oʻzbekcha lotin maqola kirillda ham mavjud */
function articleUrls(articleLocale: string, slug: string, current: string) {
  const path = `/maqolalar/${slug}`;
  if (articleLocale === "ru") return { canonical: localeUrl("ru", path), languages: { ru: localeUrl("ru", path) } };
  if (articleLocale === "uz_Cyrl") return { canonical: localeUrl("uz-Cyrl", path), languages: { "uz-Cyrl": localeUrl("uz-Cyrl", path) } };
  const own = current === "uz-Cyrl" ? "uz-Cyrl" : "uz";
  return {
    canonical: localeUrl(own, path),
    languages: { uz: localeUrl("uz", path), "uz-Cyrl": localeUrl("uz-Cyrl", path), "x-default": localeUrl("uz", path) },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await getArticle(slug);
  if (!a) return {};
  const txt = articleText(a, locale);
  const description = (txt.excerpt || htmlToText(txt.content)).slice(0, 160);
  return {
    title: txt.title,
    description,
    alternates: articleUrls(a.locale, a.slug, locale),
    openGraph: {
      type: "article",
      title: txt.title,
      description,
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      ...(a.coverUrl && { images: [{ url: a.coverUrl }] }),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = await getArticle(slug);
  if (!a) notFound();
  const [t, format, more] = await Promise.all([
    getTranslations("articles"),
    getFormatter(),
    prisma.article.findMany({
      where: { published: true, locale: a.locale, id: { not: a.id } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, slug: true, title: true, excerpt: true, content: true, locale: true },
    }),
  ]);
  const txt = articleText(a, locale);
  const url = articleUrls(a.locale, a.slug, locale).canonical;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: txt.title,
          description: txt.excerpt ?? undefined,
          datePublished: a.publishedAt?.toISOString(),
          dateModified: a.updatedAt.toISOString(),
          inLanguage: a.locale === "uz_Cyrl" || locale === "uz-Cyrl" ? "uz-Cyrl" : a.locale,
          mainEntityOfPage: url,
          ...(a.coverUrl && { image: a.coverUrl }),
          publisher: { "@type": "Organization", name: site.brand, url: site.url },
        })}
      />
      <PageHeader variant="plain" locale={locale} path={`/maqolalar/${a.slug}`} title={txt.title} crumbs={[{ href: "/maqolalar", label: t("title") }]}>
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
          {a.publishedAt && <time dateTime={a.publishedAt.toISOString()}>{format.dateTime(a.publishedAt, { dateStyle: "long" })}</time>}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" /> {t("minutes", { count: readingMinutes(a.content) })}
          </span>
        </div>
      </PageHeader>

      {a.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.coverUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" />
      ) : (
        <ArticleCover seed={a.slug} className="mt-6 aspect-[21/9] w-full rounded-2xl" />
      )}
      {txt.excerpt && <p className="mt-6 text-lg font-medium leading-relaxed text-navy-800">{txt.excerpt}</p>}
      {/* Kontent admin tomonidan saqlanganda sanitize-html bilan tozalangan */}
      <div className="prose-content mt-6 text-[1.05rem]" dangerouslySetInnerHTML={{ __html: txt.content }} />

      <CtaBox
        title={t("ctaTitle")}
        text={t("ctaText")}
        action={
          <Link href="/murojaat" className={buttonVariants({ variant: "primary", size: "lg" })}>
            {t("ctaButton")}
          </Link>
        }
      />

      {more.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold">{t("more")}</h2>
          <ul className="mt-4 divide-y divide-navy-100 rounded-2xl border border-navy-100">
            {more.map((m) => (
              <li key={m.id}>
                <Link href={`/maqolalar/${m.slug}`} className="block px-5 py-4 font-semibold text-navy-900 hover:text-brand-700">
                  {articleText(m, locale).title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link href="/maqolalar" className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
    </article>
  );
}
