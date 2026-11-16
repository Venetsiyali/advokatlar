"use client";

import { useTranslations } from "next-intl";
import { AdminForm, AField, Check, SubmitButton, useAdminForm } from "@/components/admin/admin-form";
import { RichEditor } from "@/components/admin/rich-editor";
import { saveTopicAction } from "@/server/admin-actions";

export type TopicInput = {
  id?: string;
  slug: string;
  title: string;
  titleUzCyrl: string;
  titleRu: string;
  summary: string;
  summaryRu: string;
  content: string;
  contentRu: string;
  icon: string;
  specializationId: string;
  sortOrder: number;
  showOnHome: boolean;
  published: boolean;
};

export function TopicForm({ topic, specs }: { topic: TopicInput; specs: { id: string; name: string }[] }) {
  return (
    <AdminForm action={saveTopicAction} redirectTo={topic.id ? undefined : "/admin/mavzular/{id}"} className="space-y-5">
      <Fields topic={topic} specs={specs} />
    </AdminForm>
  );
}

function Fields({ topic, specs }: { topic: TopicInput; specs: { id: string; name: string }[] }) {
  const t = useTranslations("admin.topic");
  const { state } = useAdminForm();
  const contentInvalid = state.status === "error" && !!state.fields?.includes("content");
  return (
    <>
      {topic.id && <input type="hidden" name="id" value={topic.id} />}
      <div className="grid gap-4 md:grid-cols-3">
        <AField name="title" label={t("title")}>
          {({ id, cls }) => <input id={id} name="title" defaultValue={topic.title} maxLength={120} className={cls} />}
        </AField>
        <AField name="titleUzCyrl" label={t("titleUzCyrl")} hint={t("autoHint")}>
          {({ id, cls }) => <input id={id} name="titleUzCyrl" defaultValue={topic.titleUzCyrl} maxLength={120} className={cls} />}
        </AField>
        <AField name="titleRu" label={t("titleRu")}>
          {({ id, cls }) => <input id={id} name="titleRu" defaultValue={topic.titleRu} maxLength={120} className={cls} />}
        </AField>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AField name="slug" label={t("slug")}>
          {({ id, cls }) => <input id={id} name="slug" defaultValue={topic.slug} maxLength={100} className={`${cls} font-mono text-sm`} />}
        </AField>
        <AField name="specializationId" label={t("specialization")}>
          {({ id, cls }) => (
            <select id={id} name="specializationId" defaultValue={topic.specializationId} className={cls}>
              <option value="">{t("none")}</option>
              {specs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </AField>
        <div className="grid grid-cols-2 gap-4">
          <AField name="icon" label={t("icon")}>
            {({ id, cls }) => <input id={id} name="icon" defaultValue={topic.icon} maxLength={40} className={`${cls} font-mono text-sm`} placeholder="scale" />}
          </AField>
          <AField name="sortOrder" label={t("sortOrder")}>
            {({ id, cls }) => <input id={id} name="sortOrder" type="number" min={0} max={9999} defaultValue={topic.sortOrder} className={cls} />}
          </AField>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AField name="summary" label={t("summary")}>
          {({ id, cls }) => <textarea id={id} name="summary" defaultValue={topic.summary} maxLength={300} rows={2} className={`${cls} h-auto py-2.5`} />}
        </AField>
        <AField name="summaryRu" label={t("summaryRu")}>
          {({ id, cls }) => <textarea id={id} name="summaryRu" defaultValue={topic.summaryRu} maxLength={300} rows={2} className={`${cls} h-auto py-2.5`} />}
        </AField>
      </div>
      <div>
        <label htmlFor="f-content" className="mb-1.5 block text-sm font-semibold text-navy-800">
          {t("content")}
        </label>
        <RichEditor name="content" initial={topic.content} invalid={contentInvalid} id="f-content" />
        <p className="mt-1 text-xs text-slate-500">{t("cyrlAuto")}</p>
      </div>
      <div>
        <label htmlFor="f-contentRu" className="mb-1.5 block text-sm font-semibold text-navy-800">
          {t("contentRu")}
        </label>
        <RichEditor name="contentRu" initial={topic.contentRu} id="f-contentRu" />
        <p className="mt-1 text-xs text-slate-500">{t("ruFallback")}</p>
      </div>
      <div className="flex flex-wrap gap-6">
        <Check name="published" label={t("published")} defaultChecked={topic.published} />
        <Check name="showOnHome" label={t("showOnHome")} defaultChecked={topic.showOnHome} />
      </div>
      <SubmitButton />
    </>
  );
}
