import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { clickSign, clickSignOk, extendedEnd, paymeAuthOk, paymeCheckoutUrl, revertedEnd, sameAmount, toTiyin } from "./payments-core";

const now = new Date("2026-11-15T10:00:00Z");
const day = 86400_000;

describe("obuna muddatini uzaytirish", () => {
  it("faol obunaga oxiridan qoʻshiladi", () => {
    const end = new Date(now.getTime() + 5 * day);
    expect(extendedEnd({ endsAt: end, status: "FAOL" }, now, 30).getTime()).toBe(end.getTime() + 30 * day);
  });
  it("muddati oʻtgan yoki yoʻq obunada hozirdan", () => {
    expect(extendedEnd({ endsAt: new Date(now.getTime() - day), status: "MUDDATI_OTGAN" }, now, 30).getTime()).toBe(now.getTime() + 30 * day);
    expect(extendedEnd(null, now, 30).getTime()).toBe(now.getTime() + 30 * day);
  });
  it("sinov muddatidagi advokat qolgan kunlarini yoʻqotmaydi", () => {
    const end = new Date(now.getTime() + 10 * day);
    expect(extendedEnd({ endsAt: end, status: "SINOV" }, now, 30).getTime()).toBe(end.getTime() + 30 * day);
  });
  it("bekor qilinganda qaytariladi", () => {
    expect(revertedEnd(new Date(now.getTime() + 30 * day), 30).getTime()).toBe(now.getTime());
  });
});

describe("Payme", () => {
  it("checkout URL base64 parametrlar bilan", () => {
    const url = paymeCheckoutUrl({ merchantId: "M1", orderId: "ord1", amountUzs: 99000, returnUrl: "https://x.uz/kabinet/obuna", lang: "uz", test: true });
    expect(url.startsWith("https://checkout.test.paycom.uz/")).toBe(true);
    const decoded = Buffer.from(url.split("/").pop()!, "base64").toString();
    expect(decoded).toBe("m=M1;ac.order_id=ord1;a=9900000;c=https://x.uz/kabinet/obuna;l=uz");
    expect(toTiyin(99000)).toBe(9900000);
  });
  it("Basic auth tekshiruvi", () => {
    const h = `Basic ${Buffer.from("Paycom:secret").toString("base64")}`;
    expect(paymeAuthOk(h, "secret")).toBe(true);
    expect(paymeAuthOk(h, "other")).toBe(false);
    expect(paymeAuthOk(`Basic ${Buffer.from("Hacker:secret").toString("base64")}`, "secret")).toBe(false);
    expect(paymeAuthOk(null, "secret")).toBe(false);
    expect(paymeAuthOk(h, "")).toBe(false);
  });
});

describe("Click", () => {
  const base = { click_trans_id: "123", service_id: "77", merchant_trans_id: "ord1", amount: "99000.00", sign_time: "2026-11-15 10:00:00" };
  it("prepare imzosi (prepare_id siz)", () => {
    const p = { ...base, action: "0" };
    const expected = createHash("md5").update("12377SECRETord199000.0002026-11-15 10:00:00").digest("hex");
    expect(clickSign(p, "SECRET")).toBe(expected);
    expect(clickSignOk({ ...p, sign_string: expected }, "SECRET")).toBe(true);
    expect(clickSignOk({ ...p, sign_string: expected }, "WRONG")).toBe(false);
  });
  it("complete imzosi prepare_id ni oʻz ichiga oladi", () => {
    const p = { ...base, action: "1", merchant_prepare_id: "555" };
    const expected = createHash("md5").update("12377SECRETord155599000.0012026-11-15 10:00:00").digest("hex");
    expect(clickSign(p, "SECRET")).toBe(expected);
  });
  it("summa taqqoslash", () => {
    expect(sameAmount("99000.00", 99000)).toBe(true);
    expect(sameAmount("98999", 99000)).toBe(false);
  });
});
