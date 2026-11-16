"use client";

import { useTranslations } from "next-intl";
import { AdminForm, AField, Check, SubmitButton } from "@/components/admin/admin-form";
import { savePlanAction, saveSettingsAction } from "@/server/admin-actions";

export type SettingsInput = {
  trialDays: number;
  trialDeadline: string;
  dispatchBatchSize: number;
  dispatchTimeoutHours: number;
  adminAlertHours: number;
};

export function SettingsForm({ s }: { s: SettingsInput }) {
  const t = useTranslations("admin.settings");
  const num = (name: keyof SettingsInput, min: number, max: number, hint?: string) => (
    <AField name={name} label={t(name)} hint={hint}>
      {({ id, cls }) => <input id={id} name={name} type="number" min={min} max={max} defaultValue={s[name]} className={cls} />}
    </AField>
  );
  return (
    <AdminForm action={saveSettingsAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {num("trialDays", 0, 365)}
        <AField name="trialDeadline" label={t("trialDeadline")} hint={t("trialDeadlineHint")}>
          {({ id, cls }) => <input id={id} name="trialDeadline" type="date" defaultValue={s.trialDeadline} className={cls} />}
        </AField>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {num("dispatchBatchSize", 1, 10)}
        {num("dispatchTimeoutHours", 1, 48)}
        {num("adminAlertHours", 1, 168)}
      </div>
      <SubmitButton>{t("save")}</SubmitButton>
    </AdminForm>
  );
}

export type PlanInput = {
  id: string;
  slug: string;
  nameUz: string;
  nameUzCyrl: string;
  nameRu: string;
  priceUzs: number;
  periodDays: number;
  isActive: boolean;
  features: string[];
};

export function PlanForm({ plan }: { plan: PlanInput }) {
  const t = useTranslations("admin.settings");
  const tp = useTranslations("admin.topic");
  return (
    <AdminForm action={savePlanAction} className="space-y-4">
      <input type="hidden" name="id" value={plan.id} />
      <div className="grid gap-4 md:grid-cols-3">
        <AField name="nameUz" label={t("nameUz")}>
          {({ id, cls }) => <input id={id} name="nameUz" defaultValue={plan.nameUz} maxLength={80} className={cls} />}
        </AField>
        <AField name="nameUzCyrl" label={t("nameUzCyrl")} hint={tp("autoHint")}>
          {({ id, cls }) => <input id={id} name="nameUzCyrl" defaultValue={plan.nameUzCyrl} maxLength={80} className={cls} />}
        </AField>
        <AField name="nameRu" label={t("nameRu")}>
          {({ id, cls }) => <input id={id} name="nameRu" defaultValue={plan.nameRu} maxLength={80} className={cls} />}
        </AField>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AField name="priceUzs" label={t("priceUzs")}>
          {({ id, cls }) => <input id={id} name="priceUzs" type="number" min={0} step={1000} defaultValue={plan.priceUzs} className={cls} />}
        </AField>
        <AField name="periodDays" label={t("periodDays")}>
          {({ id, cls }) => <input id={id} name="periodDays" type="number" min={1} max={366} defaultValue={plan.periodDays} className={cls} />}
        </AField>
        <div className="flex items-end pb-3">
          <Check name="isActive" label={t("isActive")} defaultChecked={plan.isActive} />
        </div>
      </div>
      <AField name="features" label={t("features")} hint={t("featuresHint")}>
        {({ id, cls }) => <textarea id={id} name="features" rows={4} defaultValue={plan.features.join("\n")} className={`${cls} h-auto py-2.5`} />}
      </AField>
      <SubmitButton>{t("save")}</SubmitButton>
    </AdminForm>
  );
}
