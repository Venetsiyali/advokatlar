"use client";

import { useTranslations } from "next-intl";
import { AdminForm, AField, SubmitButton } from "@/components/admin/admin-form";
import { RichEditor } from "@/components/admin/rich-editor";
import { saveStaticPageAction } from "@/server/admin-actions";

export type StaticPageInput = {
  slug: string;
  titleUz: string;
  titleUzCyrl: string;
  titleRu: string;
  contentUz: string;
  contentUzCyrl: string;
  contentRu: string;
};

export function StaticPageForm({ page }: { page: StaticPageInput }) {
  const t = useTranslations("admin.page");
  const langs = [
    { suffix: "Uz", hint: undefined },
    { suffix: "UzCyrl", hint: t("cyrlHint") },
    { suffix: "Ru", hint: undefined },
  ] as const;
  return (
    <AdminForm action={saveStaticPageAction} className="space-y-6">
      <input type="hidden" name="slug" value={page.slug} />
      {langs.map(({ suffix, hint }) => {
        const titleKey = `title${suffix}` as const;
        const contentKey = `content${suffix}` as const;
        return (
          <fieldset key={suffix} className="space-y-3 rounded-2xl border border-navy-100 p-4">
            <AField name={titleKey} label={t(titleKey)} hint={hint}>
              {({ id, cls }) => <input id={id} name={titleKey} defaultValue={page[titleKey]} maxLength={150} className={cls} />}
            </AField>
            <div>
              <label htmlFor={`f-${contentKey}`} className="mb-1.5 block text-sm font-semibold text-navy-800">
                {t(contentKey)}
              </label>
              <RichEditor name={contentKey} initial={page[contentKey]} id={`f-${contentKey}`} />
            </div>
          </fieldset>
        );
      })}
      <SubmitButton />
    </AdminForm>
  );
}
