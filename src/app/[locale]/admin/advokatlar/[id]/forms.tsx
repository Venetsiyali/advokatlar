"use client";

import { useTranslations } from "next-intl";
import { AdminForm, AField, SubmitButton } from "@/components/admin/admin-form";
import { extendSubscriptionAction, rejectLawyerAction } from "@/server/admin-actions";

export function RejectForm({ lawyerId }: { lawyerId: string }) {
  const t = useTranslations("admin.lawyer");
  return (
    <AdminForm action={rejectLawyerAction} className="space-y-3" showSaved={false}>
      <input type="hidden" name="lawyerId" value={lawyerId} />
      <AField name="reason" label={t("rejectReason")}>
        {({ id, cls }) => (
          <textarea id={id} name="reason" rows={3} maxLength={500} placeholder={t("rejectReasonPlaceholder")} className={`${cls} h-auto py-2.5`} />
        )}
      </AField>
      <SubmitButton variant="outline">{t("rejectSubmit")}</SubmitButton>
    </AdminForm>
  );
}

export function ExtendForm({ lawyerId }: { lawyerId: string }) {
  const t = useTranslations("admin.lawyer");
  return (
    <AdminForm action={extendSubscriptionAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="lawyerId" value={lawyerId} />
      <AField name="days" label={t("extendDays")} className="w-36">
        {({ id, cls }) => <input id={id} name="days" type="number" min={1} max={366} defaultValue={30} className={cls} />}
      </AField>
      <SubmitButton variant="outline">{t("extendSubmit")}</SubmitButton>
    </AdminForm>
  );
}
