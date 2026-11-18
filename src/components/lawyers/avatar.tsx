/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

const PALETTE = ["bg-navy-600", "bg-navy-800", "bg-navy-500", "bg-brand-700", "bg-navy-700"];

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const parts = name.split(" ");
  const initials = ((parts[1]?.[0] ?? "") + (parts[0]?.[0] ?? "")).toUpperCase();
  const color = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  if (src) {
    return <img src={src} alt={name} className={cn("rounded-2xl object-cover", className)} loading="lazy" />;
  }
  return (
    <div className={cn("flex items-center justify-center rounded-2xl font-bold text-white", color, className)} aria-hidden>
      {initials}
    </div>
  );
}
