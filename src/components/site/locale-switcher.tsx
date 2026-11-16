"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { localeNames, locales, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Qisqa yozuvlar — sarlavhada doim koʻrinadi (telefonda ham): Oʻz | Ўз | Рус
const SHORT: Record<AppLocale, string> = { uz: "Oʻz", "uz-Cyrl": "Ўз", ru: "Рус" };

/**
 * Til almashtirgich: uchta doim koʻrinadigan tugma (oʻzbek lotin, oʻzbek kirill, rus).
 * Havola sifatida chiziladi (JavaScript'siz ham ishlaydi); bosilganda joriy sahifa va
 * URL parametrlari (masalan, katalog filtrlari) saqlanadi.
 */
export function LocaleSwitcher({ label, className }: { label: string; className?: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, start] = useTransition();

  // @ts-expect-error -- dinamik segmentlar params orqali uzatiladi
  const href: React.ComponentProps<typeof Link>["href"] = { pathname, params };

  return (
    <nav aria-label={label} className={cn("inline-flex shrink-0 items-center rounded-xl bg-navy-50 p-0.5", pending && "opacity-60", className)}>
      {locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            locale={l}
            hrefLang={l}
            lang={l}
            title={localeNames[l]}
            aria-label={localeNames[l]}
            aria-current={active ? "true" : undefined}
            // Til almashganda sahifa boshiga sakramaydi
            scroll={false}
            onClick={(e) => {
              if (active) return e.preventDefault();
              const query = Object.fromEntries(new URLSearchParams(window.location.search));
              if (Object.keys(query).length === 0) return;
              // Filtr va boshqa parametrlarni saqlab oʻtish
              e.preventDefault();
              start(() => {
                // @ts-expect-error -- dinamik segmentlar params orqali uzatiladi
                router.replace({ pathname, params, query }, { locale: l, scroll: false });
              });
            }}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-[0.6rem] px-1.5 text-xs font-semibold transition sm:min-w-9 sm:px-2.5 sm:text-sm",
              active ? "bg-white text-navy-900 shadow-soft" : "text-navy-600 active:bg-white/70 sm:hover:text-navy-900",
            )}
          >
            {SHORT[l]}
          </Link>
        );
      })}
    </nav>
  );
}
