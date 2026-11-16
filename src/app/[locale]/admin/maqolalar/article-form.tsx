"use client";

import { useTranslations } from "next-intl";
import { AdminForm, AField, Check, SubmitButton, useAdminForm } from "@/components/admin/admin-form";
import { RichEditor } from "@/components/admin/rich-editor";
import { saveArticleAction } from "@/server/admin-actions";

export type ArticleInput = {
  id?: string;
  title: string;
  slug: string;
  locale: "uz" | "uz_Cyrl" | "ru";
  excerpt: string;
  content: string;
  coverUrl: string | null;
  published: boolean;
};

export function ArticleForm({ article }: { article: ArticleInput }) {
  return (
    <AdminForm action={saveArticleAction} redirectTo={article.id ? undefined : "/admin/maqolalar/{id}"} className="space-y-5">
      <Fields article={article} />
    </AdminForm>
  );
}

function Fields({ article }: { article: ArticleInput }) {
  const t = useTranslations("admin.article");
  const tl = useTranslations("admin.locales");
  const { state } = useAdminForm();
  const contentInvalid = state.status === "error" && !!state.fields?.includes("content");
  return (
    <>
      {article.id && <input type="hidden" name="id" value={article.id} />}
      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <AField name="title" label={t("title")}>
          {({ id, cls }) => <input id={id} name="title" defaultValue={article.title} maxLength={200} className={cls} />}
        </AField>
        <AField name="locale" label={t("locale")}>
          {({ id, cls }) => (
            <select id={id} name="locale" defaultValue={article.locale} className={cls}>
              {(["uz", "uz_Cyrl", "ru"] as const).map((l) => (
                <option key={l} value={l}>
                  {tl(l)}
                </option>
              ))}
            </select>
          )}
        </AField>
      </div>
      <AField name="slug" label={t("slug")} hint={t("slugHint")}>
        {({ id, cls }) => <input id={id} name="slug" defaultValue={article.slug} maxLength={100} className={`${cls} font-mono text-sm`} placeholder="masalan-maqola-nomi" />}
      </AField>
      <AField name="excerpt" label={t("excerpt")} hint={t("excerptHint")}>
        {({ id, cls }) => <textarea id={id} name="excerpt" defaultValue={article.excerpt} maxLength={400} rows={2} className={`${cls} h-auto py-2.5`} />}
      </AField>
      <div>
        <label htmlFor="f-content" className="mb-1.5 block text-sm font-semibold text-navy-800">
          {t("content")}
        </label>
        <RichEditor name="content" initial={article.content} invalid={contentInvalid} id="f-content" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AField name="cover" label={t("cover")}>
          {({ id }) => (
            <div className="space-y-2">
              {article.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.coverUrl} alt="" className="h-28 rounded-xl object-cover" />
              )}
              <input id={id} name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:font-semibold file:text-navy-800" />
              {article.coverUrl && <Check name="removeCover" label={t("removeCover")} />}
            </div>
          )}
        </AField>
        <div className="flex items-end">
          <Check name="published" label={t("published")} defaultChecked={article.published} />
        </div>
      </div>
      <SubmitButton />
    </>
  );
}
