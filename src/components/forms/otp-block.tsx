"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Field, PhoneInput, inputCls, phoneComplete } from "./fields";
import { Turnstile } from "./turnstile";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export type OtpState = { phone: string; code: string; sent: boolean };

/**
 * Telefon + SMS kod bloki. Kodni yuborishni oʻzi bajaradi; kodni tekshirish — ota komponentning
 * server action / signIn chaqiruvida (kod bir martalik, faqat bitta joyda “ishlatiladi”).
 */
export function OtpBlock({
  value,
  onChange,
  onError,
  locked,
}: {
  value: OtpState;
  onChange: (v: OtpState) => void;
  onError: (msg: string | null) => void;
  locked?: boolean;
}) {
  const t = useTranslations("auth");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [channel, setChannel] = useState<"sms" | "telegram">("sms");
  const [captcha, setCaptcha] = useState<string>("");
  const onToken = useCallback((tk: string) => setCaptcha(tk), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function send() {
    onError(null);
    if (!phoneComplete(value.phone)) return onError(t("errors.BAD_PHONE"));
    setBusy(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value.phone, turnstileToken: captcha }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; devCode?: string; retryAfterSec?: number; channel?: "sms" | "telegram" };
      if (!json.ok) {
        onError(t.has(`errors.${json.error}`) ? t(`errors.${json.error}` as "errors.generic") : t("errors.generic"));
        if (json.retryAfterSec && json.retryAfterSec < 300) setCooldown(json.retryAfterSec);
        return;
      }
      setDevCode(json.devCode ?? null);
      setChannel(json.channel ?? "sms");
      setCooldown(60);
      onChange({ ...value, sent: true, code: "" });
    } catch {
      onError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label={t("phone")} htmlFor="otp-phone">
        <div className="flex gap-2">
          <PhoneInput id="otp-phone" value={value.phone} disabled={value.sent || locked} onChange={(p) => onChange({ ...value, phone: p })} />
          {!value.sent && !locked && (
            <Button type="button" variant="navy" className="h-12 shrink-0" onClick={send} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : t("sendCode")}
            </Button>
          )}
        </div>
      </Field>
      {!value.sent && !locked && <Turnstile onToken={onToken} />}

      {value.sent && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {channel === "telegram" ? t("codeSentTelegram", { bot: site.telegramBot }) : t("codeSent", { phone: value.phone })}
          </p>
          {devCode && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800" data-testid="dev-code">
              {t("devCode", { code: devCode })}
            </p>
          )}
          <Field label={t("code")} htmlFor="otp-code">
            <input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={value.code}
              onChange={(e) => onChange({ ...value, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              className={`${inputCls} tracking-[0.5em]`}
              placeholder="••••••"
            />
          </Field>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <button type="button" className="font-medium text-navy-700 hover:underline" onClick={() => onChange({ phone: value.phone, code: "", sent: false })}>
              {t("changePhone")}
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              className="font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline"
              onClick={send}
            >
              {cooldown > 0 ? t("resendIn", { sec: cooldown }) : t("resend")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
