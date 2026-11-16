"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

let cached: Promise<boolean> | null = null;

/**
 * Foydalanuvchi kirganmi — mijoz tomonida aniqlanadi. Shu tufayli ochiq sahifalar
 * cookie'ga bogʻliq emas va statik (ISR) generatsiya qilinadi.
 */
export function useLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    cached ??= fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => !!s?.user)
      .catch(() => false);
    let alive = true;
    cached.then((v) => alive && setLoggedIn(v));
    return () => {
      alive = false;
    };
  }, []);
  return loggedIn;
}

export function AccountLink({ loginLabel, cabinetLabel, className, onClick }: { loginLabel: string; cabinetLabel: string; className?: string; onClick?: () => void }) {
  const loggedIn = useLoggedIn();
  return (
    <Link href={loggedIn ? "/kabinet" : "/kirish"} className={className} onClick={onClick}>
      {loggedIn ? cabinetLabel : loginLabel}
    </Link>
  );
}
