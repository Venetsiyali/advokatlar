import { describe, expect, it } from "vitest";
import { reviveDates } from "./revive-dates";

describe("reviveDates (kesh)", () => {
  it("JSON'dan kelgan ISO sanalarni Date ga qaytaradi", () => {
    const out = reviveDates(JSON.parse(JSON.stringify({ a: [{ at: new Date("2026-11-16T05:00:00.000Z") }], n: 1, s: "matn" })));
    expect(out.a[0].at).toBeInstanceOf(Date);
    expect(out.a[0].at.toISOString()).toBe("2026-11-16T05:00:00.000Z");
    expect(out.n).toBe(1);
    expect(out.s).toBe("matn");
  });

  it("kesh boʻsh boʻlganda: haqiqiy Date obyektlari buzilmaydi", () => {
    const d = new Date("2026-11-16T05:00:00.000Z");
    const out = reviveDates({ rows: [{ publishedAt: d, title: "x" }] });
    expect(out.rows[0].publishedAt).toBe(d);
    expect(out.rows[0].publishedAt.toISOString()).toBe("2026-11-16T05:00:00.000Z");
  });

  it("null va sana boʻlmagan matnlar oʻzgarmaydi", () => {
    expect(reviveDates({ a: null, b: "2026-11-16" })).toEqual({ a: null, b: "2026-11-16" });
  });
});
