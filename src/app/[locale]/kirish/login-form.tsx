"use client";

import { track } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputCls } from "@/components/forms/fields";
import { OtpBlock, type OtpState } from "@/components/forms/otp-block";

export function LoginForm({
  role,
  redirectTo,
  telegramBot,
}: {
  role: "advokat" | "mijoz";
  redirectTo: string;
  telegramBot?: string;
}) {
  const t = useTranslations("auth");
  const [otp, setOtp] = useState<OtpState>({ phone: "", code: "", sent: false });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorText = (code?: string | null) =>
    code && t.has(`errors.${code}`) ? t(`errors.${code}` as "errors.generic") : t("errors.generic");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.code.length !== 6) return;
    setBusy(true);
    setError(null);
    const res = await signIn("phone-otp", { phone: otp.phone, code: otp.code, role, name, redirect: false });
    if (res?.error) {
      setBusy(false);
      setError(errorText(res.code));
      return;
    }
    track(role === "advokat" ? "sign_up" : "login", { method: "phone" });
    // Toʻliq qayta yuklash — header va server komponentlar yangi sessiyani koʻrishi uchun
    window.location.assign(redirectTo);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <OtpBlock value={otp} onChange={setOtp} onError={setError} />
      {otp.sent && (
        <>
          <Field label={t("name")} htmlFor="login-name">
            <input id="login-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={inputCls} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy || otp.code.length !== 6}>
            {busy && <Loader2 className="animate-spin" />} {t("submit")}
          </Button>
        </>
      )}

      {telegramBot && role === "mijoz" && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
            <span className="h-px flex-1 bg-navy-100" /> {t("or")} <span className="h-px flex-1 bg-navy-100" />
          </div>
          <TelegramLogin bot={telegramBot} redirectTo={redirectTo} onError={(c) => setError(errorText(c))} />
        </>
      )}

      <p className="text-center text-sm">
        {role === "advokat" ? (
          <Link href="/kirish" className="font-medium text-navy-700 hover:underline">
            {t("asClient")}
          </Link>
        ) : (
          <Link href={{ pathname: "/kirish", query: { rol: "advokat" } }} className="font-medium text-brand-700 hover:underline">
            {t("asLawyer")}
          </Link>
        )}
      </p>
    </form>
  );
}

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string | number>) => void;
  }
}

function TelegramLogin({ bot, redirectTo, onError }: { bot: string; redirectTo: string; onError: (code?: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const payload = JSON.stringify(Object.fromEntries(Object.entries(user).map(([k, v]) => [k, String(v)])));
      const res = await signIn("telegram", { payload, redirect: false });
      if (res?.error) onErrorRef.current(res.code ?? undefined);
      else {
        track("login", { method: "telegram" });
        window.location.assign(redirectTo);
      }
    };
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", bot);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "12");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    s.setAttribute("data-request-access", "write");
    ref.current?.appendChild(s);
    const el = ref.current;
    return () => {
      el?.replaceChildren();
    };
  }, [bot, redirectTo]);
  return <div ref={ref} className="flex justify-center" />;
}
