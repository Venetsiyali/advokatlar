"use client";

import { useTranslations } from "next-intl";
import { AdminForm, AField, SubmitButton } from "@/components/admin/admin-form";
import { adminAssignAction } from "@/server/admin-actions";

type Opt = { id: string; label: string };

export function AssignForm({ requestId, matching, others }: { requestId: string; matching: Opt[]; others: Opt[] }) {
  const t = useTranslations("admin.request");
  const te = useTranslations("admin.request.errors");
  return (
    <AdminForm
      action={adminAssignAction}
      className="space-y-3"
      showSaved={false}
      errors={Object.fromEntries((["NOT_FOUND", "CLOSED", "SAME", "CONFLICT"] as const).map((k) => [k, te(k)]))}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <AField name="lawyerId" label={t("assignTo")} hint={t("assignHint")}>
        {({ id, cls }) => (
          <select id={id} name="lawyerId" defaultValue="" className={cls}>
            <option value="" disabled>
              {t("assignChoose")}
            </option>
            {matching.length > 0 && (
              <optgroup label={t("matching")}>
                {matching.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label={t("others")}>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </AField>
      <SubmitButton>{t("assignSubmit")}</SubmitButton>
    </AdminForm>
  );
}
