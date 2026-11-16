// Analitika hodisalari (GA4 + Yandex Metrica). ID lar berilmagan boʻlsa — hech narsa qilmaydi.
// Hodisalarga shaxsiy maʼlumot (telefon, ism, matn) QOʻSHILMAYDI.

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const YM_ID = process.env.NEXT_PUBLIC_YM_ID ?? "";

export type AnalyticsEvent = "request_submitted" | "sign_up" | "login" | "begin_checkout" | "purchase" | "review_submitted";

export function track(event: AnalyticsEvent, params: Params = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
    if (YM_ID) window.ym?.(Number(YM_ID), "reachGoal", event, params);
    if (process.env.NODE_ENV !== "production" && !GA_ID && !YM_ID) console.debug("[analytics]", event, params);
  } catch {
    // Analitika xatosi foydalanuvchi oqimini buzmasligi kerak
  }
}
