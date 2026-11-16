import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/session";
import { logoutAction } from "@/server/cabinet-actions";
import { CabinetNav } from "./cabinet-nav";
import { LogOut } from "lucide-react";
import { ClientMessages } from "@/components/client-messages";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false } };

export default async function CabinetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) {
    const back = getPathname({ href: "/kabinet", locale });
    redirect(getPathname({ href: { pathname: "/kirish", query: { callbackUrl: back } }, locale }));
  }
  const [t, ta] = await Promise.all([getTranslations("cabinet"), getTranslations("auth")]);

  const items =
    user.role === "LAWYER"
      ? [
          { href: "/kabinet", label: t("overview") },
          { href: "/kabinet/murojaatlar", label: t("requests") },
          { href: "/kabinet/profil", label: t("profile") },
          { href: "/kabinet/hujjatlar", label: t("documents") },
          { href: "/kabinet/obuna", label: t("subscription") },
        ]
      : [{ href: "/kabinet", label: t("myRequests") }];
  if (user.role === "ADMIN") items.push({ href: "/admin", label: t("admin") });

  return (
    <ClientMessages ns={["cabinet", "lang", "profileForm", "request", "documentsPage", "subscriptionPage", "auth"]}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{t("hello", { name: user.lawyerProfile?.fullName || user.name || user.phone || "" })}</h1>
          <form action={logoutAction}>
            <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-navy-50">
              <LogOut className="size-4" /> {ta("logout")}
            </button>
          </form>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <CabinetNav items={items} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </ClientMessages>
  );
}
