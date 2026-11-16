import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { signedUrl } from "@/lib/storage";
import { getCurrentUser } from "@/server/session";
import { deleteDocumentAction } from "@/server/cabinet-actions";
import { ActionButton } from "@/components/forms/action-button";
import { UploadForm } from "./upload-form";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user?.lawyerProfile) redirect("/kabinet");
  const [t, format, docs] = await Promise.all([
    getTranslations("documentsPage"),
    getFormatter(),
    prisma.document.findMany({ where: { lawyerId: user.lawyerProfile.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const links = await Promise.all(docs.map((d) => signedUrl(d.storageKey)));

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("hint")}</p>
        <div className="mt-5">
          <UploadForm />
        </div>
      </Card>
      <Card className="divide-y divide-navy-100">
        {docs.length === 0 && <p className="p-6 text-center text-slate-500">{t("empty")}</p>}
        {docs.map((d, i) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 p-4">
            <FileText className="size-5 text-navy-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t(`types.${d.type}`)}</p>
              <p className="truncate text-xs text-slate-500">
                {d.fileName} · {Math.round(d.size / 1024)} KB · {format.dateTime(d.createdAt, { dateStyle: "medium" })}
              </p>
            </div>
            <a href={links[i]} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
              {t("view")}
            </a>
            <ActionButton run={deleteDocumentAction.bind(null, d.id)} label={t("delete")} variant="ghost" size="sm" confirmText={`${t("delete")}?`} />
          </div>
        ))}
      </Card>
    </div>
  );
}
