"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputCls } from "@/components/forms/fields";
import { Avatar } from "@/components/lawyers/avatar";
import { saveProfileAction, type ProfileState } from "@/server/cabinet-actions";
import { cn } from "@/lib/utils";

type Region = { id: string; name: string; districts: { id: string; name: string }[] };

export function ProfileForm({
  regions,
  specs,
  initial,
}: {
  regions: Region[];
  specs: { id: string; name: string }[];
  initial: {
    fullName: string;
    bio: string;
    education: string;
    workplace: string;
    experienceYears: number;
    licenseNumber: string;
    consultationFee: string;
    regionId: string;
    districtId: string;
    languages: string[];
    specializations: string[];
    avatarUrl: string | null;
  };
}) {
  const t = useTranslations("profileForm");
  const tc = useTranslations("cabinet");
  const tl = useTranslations("lang");
  const tr = useTranslations("request");
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, { status: "idle" });
  const [regionId, setRegionId] = useState(initial.regionId);
  const districts = regions.find((r) => r.id === regionId)?.districts ?? [];
  const bad = (f: string) => state.status === "error" && state.fields?.includes(f);
  const errText = t("errors.VALIDATION");

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {state.status === "error" && <Alert>{t(`errors.${state.error}`)}</Alert>}
      {state.status === "ok" && <Alert kind="success">{tc("saved")}</Alert>}

      <div className="flex items-center gap-4">
        <Avatar name={initial.fullName || "A A"} src={initial.avatarUrl} className="size-20 text-2xl" />
        <Field label={t("avatar")} htmlFor="p-avatar" className="flex-1">
          <input
            id="p-avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2 file:font-semibold"
          />
        </Field>
      </div>

      <Field label={t("fullName")} htmlFor="p-name" error={bad("fullName") ? errText : null}>
        <input id="p-name" name="fullName" defaultValue={initial.fullName} required maxLength={120} className={inputCls} />
      </Field>
      <Field label={t("bio")} htmlFor="p-bio">
        <textarea id="p-bio" name="bio" defaultValue={initial.bio} rows={5} maxLength={2000} className={cn(inputCls, "h-auto py-3")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("education")} htmlFor="p-edu">
          <input id="p-edu" name="education" defaultValue={initial.education} maxLength={300} className={inputCls} />
        </Field>
        <Field label={t("workplace")} htmlFor="p-work">
          <input id="p-work" name="workplace" defaultValue={initial.workplace} maxLength={200} className={inputCls} />
        </Field>
        <Field label={t("experienceYears")} htmlFor="p-exp" error={bad("experienceYears") ? errText : null}>
          <input id="p-exp" name="experienceYears" type="number" min={0} max={70} defaultValue={initial.experienceYears} className={inputCls} />
        </Field>
        <Field label={t("licenseNumber")} htmlFor="p-lic" hint={t("licenseChangedNote")} error={bad("licenseNumber") ? errText : null}>
          <input id="p-lic" name="licenseNumber" defaultValue={initial.licenseNumber} required maxLength={40} className={inputCls} />
        </Field>
        <Field label={t("consultationFee")} htmlFor="p-fee">
          <input id="p-fee" name="consultationFee" inputMode="numeric" defaultValue={initial.consultationFee} className={inputCls} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("region")} htmlFor="p-region" error={bad("regionId") ? errText : null}>
          <select id="p-region" name="regionId" value={regionId} onChange={(e) => setRegionId(e.target.value)} className={inputCls}>
            <option value="">{tr("chooseRegion")}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("district")} htmlFor="p-district">
          <select
            id="p-district"
            name="districtId"
            key={regionId}
            defaultValue={regionId === initial.regionId ? initial.districtId : ""}
            className={inputCls}
          >
            <option value="">{tr("chooseDistrict")}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className={cn("mb-2 text-sm font-semibold", bad("languages") ? "text-red-600" : "text-navy-800")}>{t("languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {["uz", "ru", "en", "kaa", "tg"].map((l) => (
            <Chip key={l} name="languages" value={l} label={tl(l)} defaultChecked={initial.languages.includes(l)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={cn("mb-2 text-sm font-semibold", bad("specializations") ? "text-red-600" : "text-navy-800")}>
          {t("specializations")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {specs.map((s) => (
            <Chip key={s.id} name="specializations" value={s.id} label={s.name} defaultChecked={initial.specializations.includes(s.id)} />
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} {tc("save")}
      </Button>
    </form>
  );
}

function Chip({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-navy-100 px-3 py-1.5 text-sm text-navy-700 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
        {label}
      </span>
    </label>
  );
}
