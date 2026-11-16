import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { ReviewForm } from "./review-form";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false } };

export default async function ReviewPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("review");
  const req =
    token.length <= 64
      ? await prisma.request.findUnique({
          where: { reviewToken: token },
          include: { assignedLawyer: { select: { fullName: true } }, review: { select: { id: true } } },
        })
      : null;

  const valid = req && req.status === "YOPILDI" && req.assignedLawyer;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        {!valid ? (
          <p className="mt-4 text-slate-600">{t("invalid")}</p>
        ) : req.review ? (
          <p className="mt-4 text-slate-600">{t("already")}</p>
        ) : (
          <>
            <p className="mt-2 text-slate-600">{t("subtitle", { code: req.code, name: req.assignedLawyer!.fullName })}</p>
            <div className="mt-6">
              <ReviewForm token={token} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
