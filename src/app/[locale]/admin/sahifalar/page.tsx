import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { STATIC_SLUGS } from "@/lib/static-pages";
import { PageTitle, Table, Td } from "@/components/admin/ui";

export default async function AdminPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, pages] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    prisma.staticPage.findMany({ select: { slug: true, titleUz: true, updatedAt: true } }),
  ]);
  return (
    <>
      <PageTitle title={t("nav.pages")} />
      <Table head={[t("cols.title"), t("cols.updated")]}>
        {STATIC_SLUGS.map((slug) => {
          const p = pages.find((x) => x.slug === slug);
          return (
            <tr key={slug} className="hover:bg-navy-50/40">
              <Td>
                <Link href={`/admin/sahifalar/${slug}`} className="font-semibold hover:text-brand-700 hover:underline">
                  {p?.titleUz ?? slug}
                </Link>
                <div className="font-mono text-xs text-slate-400">/{slug}</div>
              </Td>
              <Td className="text-slate-500">{p ? format.dateTime(p.updatedAt, { dateStyle: "short", timeStyle: "short" }) : t("page.notCreated")}</Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
