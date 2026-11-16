import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { formatUzs } from "@/lib/utils";
import { mockAllowed } from "@/server/payments/service";
import { getCurrentUser } from "@/server/session";
import { MockPayButton } from "./mock-pay-button";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

/** Mock rejim: Payme/Click kalitlari boʻlmaganda toʻlov sahifasining oʻrnini bosadi */
export default async function TestPayment({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user?.lawyerProfile) redirect("/kabinet");
  const p = await prisma.payment.findFirst({ where: { id, lawyerId: user.lawyerProfile.id } });
  if (!p || (p.provider !== "PAYME" && p.provider !== "CLICK") || !mockAllowed(p.provider)) notFound();
  const [t, tc] = await Promise.all([getTranslations("subscriptionPage"), getTranslations("common")]);

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="flex items-center gap-2 text-amber-700">
        <FlaskConical className="size-5" />
        <h2 className="text-lg font-bold">{t("mockTitle")}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">{t("mockText")}</p>
      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">{t("provider")}</dt>
          <dd className="font-semibold">{p.provider === "PAYME" ? "Payme" : "Click"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">{t("order")}</dt>
          <dd className="font-mono text-xs">{p.id}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">{t("amount")}</dt>
          <dd className="font-semibold">{tc("sum", { amount: formatUzs(p.amountUzs) })}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        {p.status === "KUTILMOQDA" ? <MockPayButton paymentId={p.id} amount={p.amountUzs} /> : <p className="text-sm font-medium text-slate-600">{t(`payStatus.${p.status}`)}</p>}
        <Link href="/kabinet/obuna" className={buttonVariants({ variant: "outline" })}>
          {t("mockBack")}
        </Link>
      </div>
    </Card>
  );
}
