import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { PageTitle, Section } from "@/components/admin/ui";
import { PlanForm, SettingsForm } from "./forms";

export default async function AdminSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, rows, plans] = await Promise.all([
    getTranslations("admin"),
    prisma.setting.findMany(),
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const get = <T,>(k: string, d: T) => (rows.find((r) => r.key === k)?.value as T | undefined) ?? d;

  return (
    <>
      <PageTitle title={t("nav.settings")} />
      <div className="space-y-5">
        <Section title={t("settings.general")}>
          <SettingsForm
            s={{
              trialDays: Number(get("trialDays", 30)),
              trialDeadline: String(get("trialDeadline", "2027-06-30")),
              dispatchBatchSize: Number(get("dispatchBatchSize", 4)),
              dispatchTimeoutHours: Number(get("dispatchTimeoutHours", 2)),
              adminAlertHours: Number(get("adminAlertHours", 24)),
            }}
          />
        </Section>
        {plans.map((p) => (
          <Section key={p.id} title={`${t("settings.plans")}: ${p.slug}`}>
            <PlanForm
              plan={{
                id: p.id,
                slug: p.slug,
                nameUz: p.nameUz,
                nameUzCyrl: p.nameUzCyrl,
                nameRu: p.nameRu,
                priceUzs: p.priceUzs,
                periodDays: p.periodDays,
                isActive: p.isActive,
                features: Array.isArray(p.features) ? (p.features as unknown[]).map(String) : [],
              }}
            />
          </Section>
        ))}
      </div>
    </>
  );
}
