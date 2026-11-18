"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Field, PhoneInput, inputCls, phoneComplete } from "./fields";
import { Turnstile } from "./turnstile";
import { Button, buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export type OtpState = { phone: string; code: string; sent: boolean };
export type PhoneChannels = { sms: boolean; telegram: boolean };

/** Telegram isboti prefiksi (server: src/lib/tg-verify.ts) */
const TG_PREFIX = "tg:";
export const isTelegramProof = (code: string) => code.startsWith(TG_PREFIX);
/** Yuborishga tayyor: 6 xonali kod yoki Telegram orqali tasdiqlangan */
export const otpReady = (v: OtpState) => v.code.length === 6 || isTelegramProof(v.code);

const POLL_MS = 2000;
const POLL_LIMIT_MS = 15 * 60_000;

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Telefonni tasdiqlash bloki: SMS kod (shlyuz ulangan boʻlsa) va/yoki Telegram bot orqali (bepul).
 * Isbotni tekshirish — ota komponentning server action / signIn chaqiruvida (bir martalik).
 */
export function OtpBlock({
  value,
  onChange,
  onError,
  locked,
  channels = { sms: true, telegram: false },
}: {
  value: OtpState;
  onChange: (v: OtpState) => void;
  onError: (msg: string | null) => void;
  locked?: boolean;
  channels?: PhoneChannels;
}) {
  const t = useTranslations("auth");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [channel, setChannel] = useState<"sms" | "telegram">("sms");
  const [captcha, setCaptcha] = useState<string>("");
  const onToken = useCallback((tk: string) => setCaptcha(tk), []);

  // Telegram orqali tasdiqlash: token brauzerda yaratiladi (faqat shu sahifa biladi)
  const [tgToken, setTgToken] = useState<string | null>(null);
  const [tgWaiting, setTgWaiting] = useState(false);
  const latest = useRef({ value, onChange, onError });
  latest.current = { value, onChange, onError };

  useEffect(() => {
    if (channels.telegram && !tgToken) setTgToken(randomToken());
  }, [channels.telegram, tgToken]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Tasdiqni kutish: har 2 soniyada va sahifaga qaytilganda darhol soʻraladi
  useEffect(() => {
    if (!tgWaiting || !tgToken) return;
    let stopped = false;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      clearTimeout(timer);
      if (stopped) return;
      try {
        const res = await fetch(`/api/tg-verify?token=${encodeURIComponent(tgToken)}`, { cache: "no-store" });
        const json = (await res.json()) as { status: string; phone?: string };
        if (stopped) return;
        if (json.status === "confirmed" && json.phone) {
          stopped = true;
          setTgWaiting(false);
          const { onChange: change, onError: err } = latest.current;
          err(null);
          change({ phone: json.phone, code: `${TG_PREFIX}${tgToken}`, sent: true });
          return;
        }
        if (json.status === "expired" || json.status === "invalid" || Date.now() - started > POLL_LIMIT_MS) {
          stopped = true;
          setTgWaiting(false);
          setTgToken(randomToken());
          latest.current.onError(t("tgExpired"));
          return;
        }
      } catch {
        // tarmoq uzilishi — keyingi urinishda davom etadi
      }
      timer = setTimeout(poll, POLL_MS);
    };
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tgWaiting, tgToken, t]);

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

  const reset = () => {
    setTgWaiting(false);
    setTgToken(randomToken());
    onChange({ phone: isTelegramProof(value.code) ? "" : value.phone, code: "", sent: false });
  };

  const tgHref = tgToken ? `https://t.me/${site.telegramBot}?start=v_${tgToken}` : undefined;
  const editing = !value.sent && !locked;

  // Telegram orqali tasdiqlangan
  if (value.sent && isTelegramProof(value.code)) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800" data-testid="tg-verified">
          <CheckCircle2 className="size-5 shrink-0" /> {t("tgVerified", { phone: value.phone })}
        </p>
        {!locked && (
          <button type="button" className="text-sm font-medium text-navy-700 hover:underline" onClick={reset}>
            {t("changePhone")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(channels.sms || value.sent) && (
        <Field label={t("phone")} htmlFor="otp-phone">
          <div className="flex gap-2">
            <PhoneInput id="otp-phone" value={value.phone} disabled={value.sent || locked} onChange={(p) => onChange({ ...value, phone: p })} />
            {editing && (
              <Button type="button" variant="navy" className="h-12 shrink-0" onClick={send} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : t("sendCode")}
              </Button>
            )}
          </div>
        </Field>
      )}
      {editing && channels.sms && <Turnstile onToken={onToken} />}

      {editing && channels.telegram && (
        <div className="space-y-3">
          {channels.sms && (
            <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
              <span className="h-px flex-1 bg-navy-100" /> {t("or")} <span className="h-px flex-1 bg-navy-100" />
            </div>
          )}
          <a
            href={tgHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!tgHref}
            onClick={(e) => {
              if (!tgHref) return e.preventDefault();
              onError(null);
              setTgWaiting(true);
            }}
            className={cn(buttonVariants({ size: "lg", variant: channels.sms ? "outline" : "primary" }), "w-full gap-2")}
          >
            <Send className="size-4" /> {tgWaiting ? t("tgOpenAgain") : t("tgVerify")}
          </a>
          <p className="text-sm text-slate-600" role="status" aria-live="polite">
            {tgWaiting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 shrink-0 animate-spin" /> {t("tgWaiting")}
              </span>
            ) : (
              t("tgVerifyHint")
            )}
          </p>
        </div>
      )}

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
            <button type="button" className="font-medium text-navy-700 hover:underline" onClick={reset}>
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
