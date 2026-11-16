"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputCls } from "@/components/forms/fields";
import { uploadDocumentAction, type DocState } from "@/server/cabinet-actions";

export function UploadForm() {
  const t = useTranslations("documentsPage");
  const tr = useTranslations("request");
  const [state, action, pending] = useActionState<DocState, FormData>(uploadDocumentAction, { status: "idle" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
      {state.status === "error" && (
        <div className="sm:col-span-3">
          <Alert>{state.error === "VALIDATION" ? tr("errors.VALIDATION") : tr(`errors.${state.error}`)}</Alert>
        </div>
      )}
      <Field label={t("type")} htmlFor="d-type">
        <select id="d-type" name="type" className={inputCls} defaultValue="LITSENZIYA">
          {(["LITSENZIYA", "GUVOHNOMA", "DIPLOM", "BOSHQA"] as const).map((k) => (
            <option key={k} value={k}>
              {t(`types.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("file")} htmlFor="d-file">
        <input
          id="d-file"
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:font-semibold"
        />
      </Field>
      <Button type="submit" className="h-12" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} {t("upload")}
      </Button>
    </form>
  );
}
