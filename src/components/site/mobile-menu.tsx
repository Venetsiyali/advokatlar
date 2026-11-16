"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { AccountLink } from "./account-link";

export function MobileMenu({
  items,
  account,
  menuLabel,
  closeLabel,
}: {
  items: { href: string; label: string }[];
  account: { loginLabel: string; cabinetLabel: string };
  menuLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? closeLabel : menuLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-xl text-navy-800 hover:bg-navy-50"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-navy-100 bg-white px-4 pb-5 pt-2 shadow-lift">
          <nav className="flex flex-col">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-navy-800 hover:bg-navy-50"
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-navy-100 pt-4">
            <LocaleSwitcher />
            <AccountLink
              {...account}
              onClick={() => setOpen(false)}
              className="rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
