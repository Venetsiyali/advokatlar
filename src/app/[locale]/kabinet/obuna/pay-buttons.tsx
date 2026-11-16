"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/forms/fields";
import { track } from "@/lib/analytics";
import { startPaymentAction } from "@/server/payment-actions";

export function PayButtons({ providers, amount }: { providers: ("PAYME" | "CLICK")[]; amount: number }) {
  const t = useTranslations("subscriptionPage");
  const [pending, start] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = (provider: "PAYME" | "CLICK") => {
    setError(null);
    setActive(provider);
    start(async () => {
      const res = await startPaymentAction(provider);
      if (!res.ok) {
        setError(t(`errors.${res.error}`));
        setActive(null);
        return;
      }
      track("begin_checkout", { provider, value: amount, currency: "UZS" });
      window.location.assign(res.url);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {providers.map((p) => (
          <Button key={p} type="button" size="lg" variant={p === "PAYME" ? "primary" : "navy"} disabled={pending} onClick={() => pay(p)} className="sm:flex-1">
            {pending && active === p && <Loader2 className="animate-spin" />}
            {p === "PAYME" ? t("payme") : t("click")}
          </Button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
