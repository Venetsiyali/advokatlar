"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Alert, inputCls } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormState } from "@/server/admin-actions";

type Ctx = { state: FormState; pending: boolean };
const FormCtx = createContext<Ctx>({ state: { status: "idle" }, pending: false });
export const useAdminForm = () => useContext(FormCtx);

/**
 * Admin formasi: server action + holat. onSubmit orqali yuboriladi (React 19 form action
 * maydonlarni tozalab yubormasligi uchun). Muvaffaqiyatda ixtiyoriy yoʻnaltirish.
 */
export function AdminForm({
  action,
  children,
  className,
  redirectTo,
  showSaved = true,
  errors,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  /** Muvaffaqiyatdan soʻng: "{id}" saqlangan yozuv ID si bilan almashtiriladi */
  redirectTo?: string;
  showSaved?: boolean;
  /** Formaga xos xato kodlari tarjimasi */
  errors?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);
  const router = useRouter();
  const t = useTranslations("admin.form");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "ok") return;
    if (redirectTo) router.push(redirectTo.replace("{id}", state.id ?? ""));
    else router.refresh();
  }, [state, redirectTo, router]);

  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form
        ref={ref}
        noValidate
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        <div className="mt-3 space-y-2" aria-live="polite">
          {state.status === "error" && (
            <Alert>{errors?.[state.error] ?? (t.has(`errors.${state.error}`) ? t(`errors.${state.error}` as "errors.VALIDATION") : state.error)}</Alert>
          )}
          {state.status === "ok" && showSaved && !redirectTo && <Alert kind="success">{t("saved")}</Alert>}
        </div>
      </form>
    </FormCtx.Provider>
  );
}

export function SubmitButton({ children, variant = "navy" }: { children?: React.ReactNode; variant?: "navy" | "primary" | "outline" }) {
  const { pending } = useAdminForm();
  const t = useTranslations("admin.form");
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />} {children ?? t("save")}
    </Button>
  );
}

/** Maydon + label + xato belgisi (state.fields ichida boʻlsa) */
export function AField({
  name,
  label,
  hint,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  children: (p: { id: string; invalid: boolean; cls: string }) => React.ReactNode;
  className?: string;
}) {
  const { state } = useAdminForm();
  const invalid = state.status === "error" && !!state.fields?.includes(name);
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-800">
        {label}
      </label>
      {children({ id, invalid, cls: cn(inputCls, invalid && "border-red-400 ring-2 ring-red-100") })}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-navy-800">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 rounded accent-brand-600" />
      {label}
    </label>
  );
}
