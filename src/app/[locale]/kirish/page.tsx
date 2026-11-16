import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/server/session";
import { ClientMessages } from "@/components/client-messages";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ rol?: string; callbackUrl?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("title"), robots: { index: false } };
}

/** Faqat sayt ichidagi nisbiy yoʻllarga qaytarish (open redirect'dan himoya) */
function safeCallback(url: string | undefined) {
  return url && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : null;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const isLawyer = sp.rol === "advokat";
  const user = await getCurrentUser();
  const fallback = getPathname({ href: "/kabinet", locale });
  const target = safeCallback(sp.callbackUrl) ?? fallback;

  // Allaqachon kirgan mijoz advokat boʻlib roʻyxatdan oʻtmoqchi boʻlsa — formani koʻrsatamiz (rol oshiriladi)
  if (user && !(isLawyer && user.role === "CLIENT")) redirect(target);

  const t = await getTranslations("auth");
  const telegramBot = process.env.TELEGRAM_BOT_TOKEN ? process.env.NEXT_PUBLIC_TELEGRAM_BOT : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{isLawyer ? t("lawyerTitle") : t("title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{isLawyer ? t("lawyerSubtitle") : t("subtitle")}</p>
        <div className="mt-6">
          <ClientMessages ns={["auth"]}>
            <LoginForm role={isLawyer ? "advokat" : "mijoz"} redirectTo={target} telegramBot={telegramBot} />
          </ClientMessages>
        </div>
      </Card>
    </div>
  );
}
