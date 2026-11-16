import { createHash } from "node:crypto";

// Toʻlov tizimlari uchun sof (bazasiz) yordamchi funksiyalar — unit testlar bilan qoplangan.

export const DAY_MS = 86400_000;
/** Payme: yaratilgan, lekin bajarilmagan tranzaksiya 12 soatdan keyin eskiradi */
export const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export const toTiyin = (uzs: number) => Math.round(uzs * 100);

/**
 * Obuna tugash sanasini uzaytirish: faol obuna boʻlsa uning oxiridan, aks holda hozirdan.
 * Shunda muddatidan oldin toʻlagan advokat qolgan kunlarini yoʻqotmaydi.
 */
export function extendedEnd(current: { endsAt: Date; status: string } | null, now: Date, days: number) {
  const active = current && (current.status === "SINOV" || current.status === "FAOL") && current.endsAt > now;
  const base = active ? current.endsAt : now;
  return new Date(base.getTime() + days * DAY_MS);
}

/** Toʻlov bekor qilinganda (Payme -2) qoʻshilgan kunlarni qaytarib olish */
export function revertedEnd(endsAt: Date, days: number) {
  return new Date(endsAt.getTime() - days * DAY_MS);
}

export function paymeCheckoutUrl(o: { merchantId: string; orderId: string; amountUzs: number; returnUrl: string; lang: string; test?: boolean }) {
  const params = [`m=${o.merchantId}`, `ac.order_id=${o.orderId}`, `a=${toTiyin(o.amountUzs)}`, `c=${o.returnUrl}`, `l=${o.lang === "ru" ? "ru" : "uz"}`].join(";");
  const host = o.test ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
  return `${host}/${Buffer.from(params).toString("base64")}`;
}

/** Payme Basic auth sarlavhasini tekshirish (login har doim "Paycom") */
export function paymeAuthOk(header: string | null | undefined, key: string) {
  if (!header?.startsWith("Basic ") || !key) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  const expected = `Paycom:${key}`;
  if (decoded.length !== expected.length) return false;
  // Doimiy vaqtli taqqoslash
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= decoded.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function clickPayUrl(o: { serviceId: string; merchantId: string; orderId: string; amountUzs: number; returnUrl: string }) {
  const q = new URLSearchParams({
    service_id: o.serviceId,
    merchant_id: o.merchantId,
    amount: o.amountUzs.toFixed(2),
    transaction_param: o.orderId,
    return_url: o.returnUrl,
  });
  return `https://my.click.uz/services/pay?${q}`;
}

export type ClickParams = {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  sign_time: string;
};

/** Click SHOP API imzosi: md5(click_trans_id + service_id + SECRET + merchant_trans_id + [merchant_prepare_id] + amount + action + sign_time) */
export function clickSign(p: ClickParams, secret: string) {
  const parts = [p.click_trans_id, p.service_id, secret, p.merchant_trans_id];
  if (p.action === "1") parts.push(p.merchant_prepare_id ?? "");
  parts.push(p.amount, p.action, p.sign_time);
  return createHash("md5").update(parts.join("")).digest("hex");
}

export function clickSignOk(p: ClickParams & { sign_string?: string }, secret: string) {
  if (!secret || !p.sign_string) return false;
  return clickSign(p, secret) === p.sign_string.toLowerCase();
}

/** Click summani "99000.00" koʻrinishida yuboradi */
export const sameAmount = (clickAmount: string, uzs: number) => Math.abs(Number(clickAmount) - uzs) < 0.01;
