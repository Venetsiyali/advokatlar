"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { mockPayAction } from "@/server/payment-actions";

export function MockPayButton({ paymentId, amount }: { paymentId: string; amount: number }) {
  const t = useTranslations("subscriptionPage");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return (
    <span className="flex flex-col gap-1">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await mockPayAction(paymentId);
            if (!res.ok) return setFailed(true);
            track("purchase", { transaction_id: paymentId, value: amount, currency: "UZS" });
            router.push({ pathname: "/kabinet/obuna", query: { tolov: "test" } });
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />} {t("mockPay")}
      </Button>
      {failed && <span className="text-xs font-medium text-red-600">{t("mockFailed")}</span>}
    </span>
  );
}
