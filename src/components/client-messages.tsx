import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/**
 * Mijoz (brauzer) komponentlariga faqat kerakli tarjima boʻlimlarini beradi.
 * Asosiy layout brauzerga hech qanday tarjima yubormaydi — sahifa HTML'i va hydration yengillashadi.
 */
export async function ClientMessages({ ns, children }: { ns: string[]; children: React.ReactNode }) {
  const all = (await getMessages()) as Record<string, unknown>;
  const messages = Object.fromEntries(ns.filter((k) => k in all).map((k) => [k, all[k]]));
  return <NextIntlClientProvider messages={messages as never}>{children}</NextIntlClientProvider>;
}
