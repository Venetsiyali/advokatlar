import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./logo";
import { site } from "@/lib/site";
import { getPublishedTopics } from "@/server/lawyers";
import { ltitle } from "@/lib/localized";
import { Mail, Phone, Send } from "lucide-react";

export async function Footer() {
  const [t, tn, locale] = await Promise.all([getTranslations("footer"), getTranslations("nav"), getLocale()]);
  const topics = (await getPublishedTopics().catch(() => [])).slice(0, 6);

  const platform = [
    { href: "/advokatlar", label: tn("lawyers") },
    { href: "/reyting", label: tn("rating") },
    { href: "/navbatchi-advokat", label: tn("onDuty") },
    { href: "/maqolalar", label: tn("articles") },
    { href: "/narxlar", label: tn("pricing") },
    { href: "/biz-haqimizda", label: tn("about") },
  ];

  return (
    <footer className="relative isolate mt-20 bg-navy-950 text-navy-100">
      <div className="bg-columns absolute inset-0 -z-10 opacity-70" aria-hidden />
      <div className="h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-xl font-extrabold text-white">{site.brand}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-navy-200">{t("tagline")}</p>
          <div className="mt-5 flex gap-3">
            <a
              href={`https://t.me/${site.telegramBot}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("telegramBot")}
              className="flex size-10 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-brand-500 hover:text-navy-950"
            >
              <Send className="size-4" />
            </a>
            {site.instagram && (
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20"
              >
                IG
              </a>
            )}
          </div>
        </div>
        <FooterCol title={t("platform")}>
          {platform.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterCol>
        <FooterCol title={t("services")}>
          {topics.map((tp) => (
            <FooterLink key={tp.slug} href={`/mavzu/${tp.slug}`}>
              {ltitle(tp, locale)}
            </FooterLink>
          ))}
        </FooterCol>
        <FooterCol title={t("contact")}>
          <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm hover:text-white">
            <Phone className="size-4" /> {site.phone}
          </a>
          <a href={`mailto:${site.email}`} className="flex items-center gap-2 text-sm hover:text-white">
            <Mail className="size-4" /> {site.email}
          </a>
          <a href={`https://t.me/${site.telegramBot}`} className="flex items-center gap-2 text-sm hover:text-white">
            <Send className="size-4" /> @{site.telegramBot}
          </a>
          <FooterLink href="/aloqa">{tn("contact")}</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-6 pb-28 text-xs text-navy-200 md:flex-row md:items-start md:justify-between lg:pb-6">
          <div className="space-y-1.5">
            <p>{t("rights", { year: new Date().getFullYear(), brand: site.brand })}</p>
            <p>{t("operator", { operator: site.operator })}</p>
            <p className="max-w-2xl opacity-80">{t("disclaimer")}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/maxfiylik-siyosati" className="hover:text-white">
              {t("privacy")}
            </Link>
            <Link href="/ommaviy-oferta" className="hover:text-white">
              {t("offer")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">{title}</h3>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-navy-200 hover:text-white">
      {children}
    </Link>
  );
}
