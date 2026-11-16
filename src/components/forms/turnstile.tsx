"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile. Sayt kaliti boʻlmasa — hech narsa chizilmaydi (mock rejim). */
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    const tryRender = () => {
      if (rendered.current || !ref.current || !window.turnstile) return false;
      window.turnstile.render(ref.current, { sitekey: SITE_KEY, callback: onToken, "refresh-expired": "auto" });
      rendered.current = true;
      return true;
    };
    if (tryRender()) return;
    const t = setInterval(() => tryRender() && clearInterval(t), 300);
    return () => clearInterval(t);
  }, [onToken]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
