"use client";

import { cn } from "@/lib/utils";

export const inputCls =
  "h-12 w-full rounded-xl border border-navy-100 bg-white px-3.5 text-base text-navy-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-navy-50 disabled:text-slate-500";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("block", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-navy-800">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

/** +998 XX XXX XX XX maskasi */
export function formatPhoneInput(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+998${parts.length ? " " + parts.join(" ") : ""}`;
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  id,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(formatPhoneInput(e.target.value))}
      onFocus={() => !value && onChange("+998 ")}
      placeholder="+998 90 123 45 67"
      className={inputCls}
    />
  );
}

export const phoneComplete = (v: string) => v.replace(/\D/g, "").length === 12;

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-brand-100 bg-brand-50 text-brand-700",
    info: "border-navy-100 bg-navy-50 text-navy-700",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}
