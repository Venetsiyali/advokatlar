import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/forms/fields";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { planFeatures } from "@/lib/plan-features";
import { cn, formatUzs } from "@/lib/utils";
import { mockAllowed, providerEnabled } from "@/server/payments/service";
import { getCurrentUser } from "@/server/session";
import { PayButtons } from "./pay-buttons";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const PAY_COLORS: Record<string, string> = {
  KUTILMOQDA: "bg-amber-50 text-amber-700",
  TOLANDI: "bg-brand-50 text-brand-700",
  BEKOR: "bg-slate-100 text-slate-600",
  XATO: "bg-red-50 text-red-700",
};

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tolov?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user?.lawyerProfile) redirect("/kabinet");
  const lawyerId = user.lawyerProfile.id;
  const sp = await searchParams;
  const [t, ts, tc, format, loc, sub, plan, payments] = await Promise.all([
    getTranslations("subscriptionPage"),
    getTranslations("status"),
    getTranslations("common"),
    getFormatter(),
    getLocale(),
    prisma.subscription.findUnique({ where: { lawyerId } }),
    prisma.plan.findFirst({ where: { slug: "oylik", isActive: true } }),
    prisma.payment.findMany({ where: { lawyerId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const providers = (["PAYME", "CLICK"] as const).filter((p) => providerEnabled(p) || mockAllowed(p));
  const testMode = providers.some((p) => !providerEnabled(p));
  const active = sub && ["SINOV", "FAOL"].includes(sub.status) && sub.endsAt > new Date();
  const features = plan ? await planFeatures(plan.features) : [];

  return (
    <div className="space-y-6">
      {sp.tolov === "qaytdi" && <Alert kind="info">{t("returned")}</Alert>}
      {sp.tolov === "test" && <Alert kind="success">{t("mockDone")}</Alert>}

      <Card className="p-6">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        {sub && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-500">{t("current")}</dt>
              <dd className={cn("mt-1 font-semibold", active ? "text-brand-700" : "text-red-600")}>{ts(sub.status)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">{t("until")}</dt>
              <dd className="mt-1 font-semibold">{format.dateTime(sub.endsAt, { dateStyle: "long" })}</dd>
            </div>
          </dl>
        )}
      </Card>

      {plan && (
        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-bold">
              {t("planTitle")}: {lname(plan, loc)}
            </h3>
            <p>
              <span className="text-2xl font-extrabold">{tc("sum", { amount: formatUzs(plan.priceUzs) })}</span>{" "}
              <span className="text-sm text-slate-500">{t("perPeriod", { days: plan.periodDays })}</span>
            </p>
          </div>
          {features.length > 0 && (
            <ul className="mt-4 space-y-2">
              {features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" /> {f}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6">
            {providers.length > 0 ? (
              <>
                <p className="mb-3 text-sm font-semibold">
                  {t("payWith")}
                  {testMode && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t("testMode")}</span>}
                </p>
                <PayButtons providers={[...providers]} amount={plan.priceUzs} />
                <p className="mt-3 flex gap-2 text-xs text-slate-500">
                  <Info className="size-4 shrink-0" /> {t("payHint")}
                </p>
              </>
            ) : (
              <Alert kind="info">{t("unavailable")}</Alert>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-bold">{t("history")}</h3>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t("noPayments")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-100 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-slate-600">
                  {format.dateTime(p.paidAt ?? p.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {p.provider === "MANUAL" ? "—" : p.provider === "PAYME" ? "Payme" : "Click"}
                </span>
                <span className="flex items-center gap-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", PAY_COLORS[p.status])}>{t(`payStatus.${p.status}`)}</span>
                  <span className="font-semibold">{tc("sum", { amount: formatUzs(p.amountUzs) })}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
