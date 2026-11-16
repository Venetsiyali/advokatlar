"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function CabinetNav({ items, root = "/kabinet" }: { items: { href: string; label: string }[]; root?: string }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
      {items.map((it) => {
        const active = it.href === root ? pathname === root : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition",
              active ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-navy-50",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
