"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Phone, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, Field, inputCls } from "@/components/forms/fields";
import { OtpBlock, otpReady, type OtpState, type PhoneChannels } from "@/components/forms/otp-block";
import { createRequestAction, type CreateRequestState } from "@/server/request-actions";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

type Region = { id: string; name: string; districts: { id: string; name: string }[] };

export function RequestForm({
  regions,
  specs,
  defaults,
  phoneVerified,
  loggedIn,
  channels,
}: {
  regions: Region[];
  specs: { id: string; name: string }[];
  defaults: { regionId: string; specializationId: string; name: string; phone: string; targetLawyer: string };
  phoneVerified: boolean;
  loggedIn: boolean;
  channels: PhoneChannels;
}) {
  const t = useTranslations("request");
  const ta = useTranslations("auth");
  const [state, action, pending] = useActionState<CreateRequestState, FormData>(createRequestAction, { status: "idle" });
  const [regionId, setRegionId] = useState(defaults.regionId);
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState<"CALL" | "TELEGRAM">("CALL");
  const [otp, setOtp] = useState<OtpState>({ phone: defaults.phone, code: "", sent: false });
  const [otpError, setOtpError] = useState<string | null>(null);

  const districts = regions.find((r) => r.id === regionId)?.districts ?? [];
  const needsOtp = !phoneVerified;
  const canSubmit = !needsOtp || otpReady(otp);

  // Analitika: yuborilgan murojaat (shaxsiy maʼlumotlarsiz)
  useEffect(() => {
    if (state.status === "ok") track("request_submitted", { contact_method: contact, matched: state.sent > 0 });
  }, [state, contact]);

  if (state.status === "ok") {
    return (
      <div className="py-6 text-center" data-testid="request-success">
        <CheckCircle2 className="mx-auto size-14 text-brand-600" />
        <h2 className="mt-4 text-2xl font-extrabold">{t("successTitle")}</h2>
        <p className="mt-3 text-slate-600">
          {state.sent > 0 ? t("successText", { code: state.code }) : t("successNoLawyer", { code: state.code })}
        </p>
        <p className="mt-2 text-sm text-slate-500">{t("successCabinet")}</p>
        <Link href={loggedIn ? "/kabinet" : "/kirish"} className={buttonVariants({ className: "mt-6" })}>
          {t("goCabinet")}
        </Link>
      </div>
    );
  }

  const errFields = state.status === "error" ? (state.fields ?? []) : [];
  const bad = (f: string) => errFields.includes(f);

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        // action={} ishlatilsa React xatodan keyin formani tozalab yuboradi — qoʻlda chaqiramiz
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {state.status === "error" && <Alert>{t(`errors.${state.error}`)}</Alert>}
      <input type="hidden" name="targetLawyer" value={defaults.targetLawyer} />
      <input type="hidden" name="phone" value={otp.phone} />
      <input type="hidden" name="code" value={otp.code} />
      <input type="hidden" name="contactMethod" value={contact} />

      <Field label={t("name")} htmlFor="r-name" error={bad("name") ? t("errors.VALIDATION") : null}>
        <input id="r-name" name="name" required minLength={2} maxLength={80} defaultValue={defaults.name} autoComplete="name" className={inputCls} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("region")} htmlFor="r-region" error={bad("regionId") ? t("errors.VALIDATION") : null}>
          <select id="r-region" name="regionId" required value={regionId} onChange={(e) => setRegionId(e.target.value)} className={inputCls}>
            <option value="">{t("chooseRegion")}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("district")} htmlFor="r-district">
          <select id="r-district" name="districtId" disabled={!districts.length} className={inputCls} key={regionId}>
            <option value="">{t("chooseDistrict")}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t("problemType")} htmlFor="r-spec" error={bad("specializationId") ? t("errors.VALIDATION") : null}>
        <select id="r-spec" name="specializationId" required defaultValue={defaults.specializationId} className={inputCls}>
          <option value="">{t("chooseProblem")}</option>
          {specs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label={t("description")}
        htmlFor="r-desc"
        hint={t("descriptionHint", { count: desc.length })}
        error={bad("description") ? t("errors.VALIDATION") : null}
      >
        <textarea
          id="r-desc"
          name="description"
          required
          minLength={10}
          maxLength={500}
          rows={5}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className={cn(inputCls, "h-auto py-3")}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-navy-800">{t("contactMethod")}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["CALL", t("call"), Phone],
              ["TELEGRAM", t("telegram"), Send],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={contact === v}
              onClick={() => setContact(v)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
                contact === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-navy-100 text-navy-700 hover:bg-navy-50",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label={t("attachment")} htmlFor="r-file">
        <input
          id="r-file"
          name="attachment"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:font-semibold file:text-navy-800 hover:file:bg-navy-100"
        />
      </Field>

      <div className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4">
        {phoneVerified ? (
          <p className="flex items-center gap-2 text-sm font-medium text-brand-700">
            <CheckCircle2 className="size-4" /> {t("phoneVerifiedAs", { phone: otp.phone })}
          </p>
        ) : (
          <>
            {otpError && (
              <div className="mb-3">
                <Alert>{otpError}</Alert>
              </div>
            )}
            <OtpBlock value={otp} onChange={setOtp} onError={setOtpError} channels={channels} />
          </>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-brand-600" />
        <span>
          {t.rich("consent", {
            link: (c) => (
              <Link href="/maxfiylik-siyosati" target="_blank" className="font-medium text-brand-700 underline">
                {c}
              </Link>
            ),
          })}
        </span>
      </label>
      {bad("consent") && <p className="-mt-3 text-xs font-medium text-red-600">{t("errors.VALIDATION")}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending || !canSubmit}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
      {needsOtp && !otp.sent && <p className="text-center text-xs text-slate-500">{ta(channels.sms ? "subtitle" : "subtitleTelegram")}</p>}
    </form>
  );
}
