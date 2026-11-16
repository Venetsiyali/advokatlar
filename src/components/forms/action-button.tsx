"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionResult } from "@/server/cabinet-actions";

/** Server action'ni chaqiradigan tugma; xatoni matn sifatida koʻrsatadi */
export function ActionButton({
  run,
  label,
  confirmText,
  errors = {},
  ...props
}: {
  run: () => Promise<ActionResult>;
  label: React.ReactNode;
  confirmText?: string;
  errors?: Record<string, string>;
} & Omit<ButtonProps, "onClick">) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError(null);
          start(async () => {
            const res = await run();
            if (!res.ok) setError(errors[res.error] ?? res.error);
            router.refresh();
          });
        }}
        {...props}
      >
        {pending && <Loader2 className="animate-spin" />} {label}
      </Button>
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </span>
  );
}
