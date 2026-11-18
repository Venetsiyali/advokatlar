import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { buttonVariants } from "@/components/ui/button";
import { AccountLink } from "./account-link";

export async function Header() {
  const t = await getTranslations("nav");
  const account = { loginLabel: t("login"), cabinetLabel: t("cabinet") };
  const items = [
    { href: "/advokatlar", label: t("lawyers") },
    { href: "/mavzu", label: t("services") },
    { href: "/navbatchi-advokat", label: t("onDuty") },
    { href: "/reyting", label: t("rating") },
    { href: "/maqolalar", label: t("articles") },
    { href: "/narxlar", label: t("pricing") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/70 bg-white/90 backdrop-blur-md">
      {/* Yuqoridagi ingichka oltin chiziq — rasmiy uslub urgʻusi */}
      <div className="h-0.5 bg-gradient-to-r from-navy-900 via-brand-500 to-navy-900" aria-hidden />
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-1.5 px-3 sm:gap-4 sm:px-4">
        <Link href="/" aria-label="Bosh sahifa">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="relative rounded-lg px-2.5 py-2 text-sm font-medium text-navy-700 transition-colors after:absolute after:inset-x-2.5 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded after:bg-brand-500 after:transition-transform after:duration-300 hover:text-navy-900 hover:after:scale-x-100">
              {it.label}
            </Link>
          ))}
        </nav>
        {/* Til almashtirgich barcha ekranlarda koʻrinadi; telefonda — logotip va menyu oʻrtasida */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
          <LocaleSwitcher label={t("language")} />
          {/* Telefonda “Kirish” menyu ichida; oʻrovchi span — tugmaning inline-flex klassi hidden ni bosib ketmasligi uchun */}
          <span className="hidden lg:block">
            <AccountLink {...account} className={buttonVariants({ variant: "navy", size: "sm" })} />
          </span>
          <MobileMenu items={items} account={account} menuLabel={t("menu")} closeLabel={t("close")} />
        </div>
      </div>
    </header>
  );
}
