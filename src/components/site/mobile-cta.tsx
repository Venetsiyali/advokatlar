"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Oʻz harakat tugmasi bor yoki forma sahifalarida koʻrsatilmaydi
const HIDDEN = [/^\/murojaat/, /^\/kirish/, /^\/kabinet/, /^\/admin/, /^\/advokat\//, /^\/baho/];

/**
 * Telefonda pastda doimiy “Murojaat qoldirish” paneli. Sahifa biroz aylantirilgach chiqadi —
 * birinchi ekrandagi asosiy tugma bilan takrorlanmasligi uchun.
 */
export function MobileCta({ label }: { label: string }) {
  const pathname = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN.some((re) => re.test(pathname))) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 lg:hidden",
        shown ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!shown}
    >
      <Link
        href="/murojaat"
        tabIndex={shown ? 0 : -1}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-300 to-brand-500 text-base font-semibold text-navy-950 shadow-gold active:from-brand-400"
      >
        <MessageSquarePlus className="size-5" /> {label}
      </Link>
    </div>
  );
}
