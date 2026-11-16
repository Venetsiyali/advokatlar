"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { clickPayUrl, paymeCheckoutUrl } from "@/lib/payments-core";
import { rateLimit } from "@/lib/rate-limit";
import { localeUrl } from "@/lib/seo";
import { clickConfig, createPayment, markPaid, mockAllowed, paymeConfig, providerEnabled } from "./payments/service";
import { getCurrentUser } from "./session";

export type StartPaymentResult = { ok: true; url: string } | { ok: false; error: "FORBIDDEN" | "UNAVAILABLE" | "RATE_LIMIT" | "NO_PLAN" };

/** Toʻlovni boshlash: buyurtma yaratiladi va toʻlov sahifasi manzili qaytariladi */
export async function startPaymentAction(provider: "PAYME" | "CLICK"): Promise<StartPaymentResult> {
  const user = await getCurrentUser();
  const lawyer = user?.lawyerProfile;
  if (!user || user.role !== "LAWYER" || !lawyer) return { ok: false, error: "FORBIDDEN" };
  if (provider !== "PAYME" && provider !== "CLICK") return { ok: false, error: "UNAVAILABLE" };
  if (!providerEnabled(provider) && !mockAllowed(provider)) return { ok: false, error: "UNAVAILABLE" };
  if (!rateLimit(`pay:${lawyer.id}`, 10, 3600_000).ok) return { ok: false, error: "RATE_LIMIT" };

  const payment = await createPayment(lawyer.id, provider);
  if (!payment) return { ok: false, error: "NO_PLAN" };
  const locale = await getLocale();
  const returnUrl = localeUrl(locale, "/kabinet/obuna?tolov=qaytdi");

  if (!providerEnabled(provider)) return { ok: true, url: localeUrl(locale, `/kabinet/obuna/test-tolov/${payment.id}`) };
  if (provider === "PAYME") {
    const c = paymeConfig();
    return { ok: true, url: paymeCheckoutUrl({ merchantId: c.merchantId, orderId: payment.id, amountUzs: payment.amountUzs, returnUrl, lang: locale, test: c.test }) };
  }
  const c = clickConfig();
  return { ok: true, url: clickPayUrl({ serviceId: c.serviceId, merchantId: c.merchantId, orderId: payment.id, amountUzs: payment.amountUzs, returnUrl }) };
}

/** Faqat mock rejim: test toʻlovni “toʻlandi” deb belgilash */
export async function mockPayAction(paymentId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const lawyer = user?.lawyerProfile;
  if (!lawyer) return { ok: false };
  const p = await prisma.payment.findFirst({ where: { id: paymentId, lawyerId: lawyer.id, status: "KUTILMOQDA" } });
  if (!p || (p.provider !== "PAYME" && p.provider !== "CLICK") || !mockAllowed(p.provider)) return { ok: false };
  const res = await markPaid(p.id, { externalId: `mock-${p.id}`, ...(p.provider === "PAYME" && { extState: 2, extCreateMs: BigInt(Date.now()) }) });
  revalidatePath("/[locale]/kabinet", "layout");
  return { ok: !!res };
}
