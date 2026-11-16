import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getPathname } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/session";
import { CabinetNav } from "../kabinet/cabinet-nav";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) {
    const back = getPathname({ href: "/admin", locale });
    redirect(getPathname({ href: { pathname: "/kirish", query: { callbackUrl: back } }, locale }));
  }
  // Admin boʻlmaganlarga panel mavjudligini ham bildirmaymiz
  if (user.role !== "ADMIN") notFound();

  const t = await getTranslations("admin");
  const items = [
    { href: "/admin", label: t("nav.dashboard") },
    { href: "/admin/advokatlar", label: t("nav.lawyers") },
    { href: "/admin/murojaatlar", label: t("nav.requests") },
    { href: "/admin/izohlar", label: t("nav.reviews") },
    { href: "/admin/tolovlar", label: t("nav.payments") },
    { href: "/admin/foydalanuvchilar", label: t("nav.users") },
    { href: "/admin/maqolalar", label: t("nav.articles") },
    { href: "/admin/mavzular", label: t("nav.topics") },
    { href: "/admin/sahifalar", label: t("nav.pages") },
    { href: "/admin/sozlamalar", label: t("nav.settings") },
    { href: "/admin/jurnal", label: t("nav.audit") },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <ShieldCheck className="size-6 text-brand-600" /> {t("title")}
      </h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
        <CabinetNav items={items} root="/admin" />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
