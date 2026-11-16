import { describe, expect, it } from "vitest";
import {
  canTransition,
  candidateScore,
  isDispatchExpired,
  needsAdminAlert,
  pickBatch,
  rankCandidates,
  updateAvgResponse,
  type Candidate,
} from "./matching-core";

const c = (id: string, p: Partial<Candidate> = {}): Candidate => ({
  id,
  rating: 4.5,
  reviewCount: 10,
  avgResponseMins: 30,
  isOnDuty: false,
  districtId: null,
  ...p,
});

describe("rankCandidates", () => {
  it("yuqori reytingli advokatni oldinga qoʻyadi", () => {
    const r = rankCandidates([c("a", { rating: 4.0 }), c("b", { rating: 5.0 })]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("bitta 5 baholi izoh koʻp izohli 4.8 dan ustun boʻlmaydi", () => {
    const r = rankCandidates([c("new", { rating: 5, reviewCount: 1 }), c("pro", { rating: 4.8, reviewCount: 40 })]);
    expect(r[0].id).toBe("pro");
  });

  it("teng reytingda tezroq javob beruvchi oldinda", () => {
    const r = rankCandidates([c("slow", { avgResponseMins: 200 }), c("fast", { avgResponseMins: 5 })]);
    expect(r[0].id).toBe("fast");
  });

  it("navbatchi va shu tumandagi advokat bonus oladi", () => {
    const base = candidateScore(c("x"), { districtId: "d1" });
    expect(candidateScore(c("x", { isOnDuty: true }), { districtId: "d1" })).toBeGreaterThan(base);
    expect(candidateScore(c("x", { districtId: "d1" }), { districtId: "d1" })).toBeGreaterThan(base);
  });

  it("natija barqaror (bir xil ballda id boʻyicha)", () => {
    const r = rankCandidates([c("b"), c("a")]);
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("pickBatch", () => {
  it("avval yuborilganlarni chiqarib, guruh hajmiga qirqadi", () => {
    const list = ["a", "b", "c", "d", "e", "f"].map((id, i) => c(id, { rating: 5 - i * 0.1 }));
    expect(pickBatch(list, { exclude: ["a", "b"], batchSize: 3 }).map((x) => x.id)).toEqual(["c", "d", "e"]);
  });

  it("nomzod qolmasa boʻsh roʻyxat", () => {
    expect(pickBatch([c("a")], { exclude: ["a"] })).toEqual([]);
  });
});

describe("vaqt qoidalari", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  it("2 soatdan keyin keyingi guruhga oʻtadi", () => {
    expect(isDispatchExpired(new Date("2026-11-15T10:30:00Z"), now)).toBe(false);
    expect(isDispatchExpired(new Date("2026-11-15T10:00:00Z"), now)).toBe(true);
    expect(isDispatchExpired(null, now)).toBe(true);
  });

  it("24 soatdan keyin adminga bir marta signal", () => {
    const old = new Date("2026-11-14T11:00:00Z");
    expect(needsAdminAlert({ status: "YUBORILDI", createdAt: old, adminAlertedAt: null }, now)).toBe(true);
    expect(needsAdminAlert({ status: "YUBORILDI", createdAt: old, adminAlertedAt: now }, now)).toBe(false);
    expect(needsAdminAlert({ status: "QABUL_QILINDI", createdAt: old, adminAlertedAt: null }, now)).toBe(false);
    expect(needsAdminAlert({ status: "YANGI", createdAt: new Date("2026-11-15T00:00:00Z"), adminAlertedAt: null }, now)).toBe(false);
  });
});

describe("holat oʻtishlari", () => {
  it("toʻgʻri oqim", () => {
    expect(canTransition("YANGI", "YUBORILDI")).toBe(true);
    expect(canTransition("YUBORILDI", "QABUL_QILINDI")).toBe(true);
    expect(canTransition("QABUL_QILINDI", "JARAYONDA")).toBe(true);
    expect(canTransition("JARAYONDA", "YOPILDI")).toBe(true);
  });
  it("yopilgan murojaatni qayta ochib boʻlmaydi", () => {
    expect(canTransition("YOPILDI", "JARAYONDA")).toBe(false);
    expect(canTransition("BEKOR_QILINDI", "YUBORILDI")).toBe(false);
    expect(canTransition("YANGI", "YOPILDI")).toBe(false);
  });
});

describe("updateAvgResponse", () => {
  it("birinchi qiymat toʻgʻridan-toʻgʻri olinadi, keyin silliqlanadi", () => {
    expect(updateAvgResponse(null, 12)).toBe(12);
    expect(updateAvgResponse(100, 0)).toBe(70);
  });
});
