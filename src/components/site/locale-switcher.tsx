"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";

const LABELS: Record<AppLocale, string> = { uz: "Oʻz", "uz-Cyrl": "Ўз", ru: "Рус" };

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, start] = useTransition();

  return (
    <label className={`relative inline-flex items-center gap-1 text-sm text-navy-700 ${className}`}>
      <Globe className="size-4" aria-hidden />
      <span className="sr-only">Til / Язык</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          start(() => {
            // @ts-expect-error -- dinamik segmentlar params orqali uzatiladi
            router.replace({ pathname, params }, { locale: next });
          });
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none"
      >
        {(Object.keys(LABELS) as AppLocale[]).map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
