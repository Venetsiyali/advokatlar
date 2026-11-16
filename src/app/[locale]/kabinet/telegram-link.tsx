"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { telegramLinkCodeAction } from "@/server/cabinet-actions";

export function TelegramLink({ bot }: { bot: string }) {
  const t = useTranslations("cabinet");
  const [code, setCode] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (code) {
    return (
      <div className="mt-2 space-y-2 text-sm">
        <p>{t("telegramLinkHint", { code })}</p>
        <a
          href={`https://t.me/${bot}?start=link_${code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-semibold text-brand-700 hover:underline"
        >
          t.me/{bot}
        </a>
      </div>
    );
  }
  return (
    <Button variant="outline" size="sm" className="mt-3" disabled={pending} onClick={() => start(async () => setCode((await telegramLinkCodeAction()).code))}>
      {t("getLinkCode")}
    </Button>
  );
}
