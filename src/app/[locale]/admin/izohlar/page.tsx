import type { ReviewStatus } from "@prisma/client";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { ADMIN_PAGE_SIZE, pageParam, strParam } from "@/server/admin";
import { moderateReviewAction } from "@/server/admin-actions";
import { ActionButton } from "@/components/forms/action-button";
import { FilterTabs, PageTitle, Pager, Pill } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const STATUSES: ReviewStatus[] = ["KUTILMOQDA", "TASDIQLANGAN", "RAD"];
type SP = Record<string, string | string[] | undefined>;

export default async function AdminReviews({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const raw = strParam(sp.holat);
  // Standart: moderatsiyani kutayotganlar
  const holat: ReviewStatus | "" = raw === "all" ? "" : (STATUSES as string[]).includes(raw) ? (raw as ReviewStatus) : "KUTILMOQDA";
  const page = pageParam(sp.page);
  const where = holat ? { status: holat } : {};

  const [t, format, rows, total, counts] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    prisma.review.findMany({
      where,
      include: { lawyer: { select: { id: true, fullName: true } }, request: { select: { id: true, code: true } } },
      orderBy: { createdAt: holat === "KUTILMOQDA" ? "asc" : "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const query = { holat: raw };

  return (
    <>
      <PageTitle title={t("nav.reviews")} />
      <FilterTabs
        pathname="/admin/izohlar"
        query={query}
        param="holat"
        value={holat || "all"}
        options={[
          ...STATUSES.map((s) => ({ value: s, label: t(`reviewStatus.${s}`), count: count(s) })),
          { value: "all", label: t("all") },
        ]}
      />
      {rows.length === 0 && <p className="rounded-2xl border border-navy-100/70 bg-white p-10 text-center text-slate-500">{t("empty")}</p>}
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex" aria-label={`${r.rating}/5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`size-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    ))}
                  </span>
                  <Pill value={r.status}>{t(`reviewStatus.${r.status}`)}</Pill>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium text-navy-900">{r.authorName}</span> →{" "}
                  <Link href={`/admin/advokatlar/${r.lawyer.id}`} className="font-medium text-navy-900 hover:underline">
                    {r.lawyer.fullName}
                  </Link>
                  {r.request && (
                    <>
                      {" · "}
                      <Link href={`/admin/murojaatlar/${r.request.id}`} className="font-mono hover:underline">
                        {t("review.forRequest", { code: r.request.code })}
                      </Link>
                    </>
                  )}
                  {" · "}
                  {format.dateTime(r.createdAt, { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status !== "TASDIQLANGAN" && <ActionButton run={moderateReviewAction.bind(null, r.id, "TASDIQLANGAN")} label={t("review.approve")} size="sm" />}
                {r.status !== "RAD" && (
                  <ActionButton
                    run={moderateReviewAction.bind(null, r.id, "RAD")}
                    label={t("review.reject")}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                  />
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{r.comment || <span className="italic text-slate-400">{t("review.noComment")}</span>}</p>
          </article>
        ))}
      </div>
      <Pager pathname="/admin/izohlar" query={query} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
