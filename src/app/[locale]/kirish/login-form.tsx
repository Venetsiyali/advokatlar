"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputCls } from "@/components/forms/fields";
import { OtpBlock, otpReady, type OtpState, type PhoneChannels } from "@/components/forms/otp-block";

export function LoginForm({
  role,
  redirectTo,
  channels,
}: {
  role: "advokat" | "mijoz";
  redirectTo: string;
  channels: PhoneChannels;
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
    if (!otpReady(otp)) return;
    setBusy(true);
    setError(null);
    const res = await signIn("phone-otp", { phone: otp.phone, code: otp.code, role, name, redirect: false });
    if (res?.error) {
      setBusy(false);
      setError(errorText(res.code));
      return;
    }
    track(role === "advokat" ? "sign_up" : "login", { method: otp.code.startsWith("tg:") ? "telegram" : "phone" });
    // Toʻliq qayta yuklash — header va server komponentlar yangi sessiyani koʻrishi uchun
    window.location.assign(redirectTo);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <OtpBlock value={otp} onChange={setOtp} onError={setError} channels={channels} />
      {otp.sent && (
        <>
          <Field label={t("name")} htmlFor="login-name">
            <input id="login-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={inputCls} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy || !otpReady(otp)}>
            {busy && <Loader2 className="animate-spin" />} {t("submit")}
          </Button>
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
