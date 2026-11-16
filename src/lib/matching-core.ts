// Saralash (matching) logikasining sof funksiyalari — DB'siz, unit-testlanadi.

export type RequestStatus = "YANGI" | "YUBORILDI" | "QABUL_QILINDI" | "JARAYONDA" | "YOPILDI" | "BEKOR_QILINDI";

export type Candidate = {
  id: string;
  rating: number;
  reviewCount: number;
  avgResponseMins: number | null;
  isOnDuty: boolean;
  districtId: string | null;
};

export const MATCHING_DEFAULTS = {
  batchSize: 4,
  timeoutHours: 2,
  adminAlertHours: 24,
};

/**
 * Nomzod balli: reyting (kam izohlilar oʻrtachaga tortiladi) + javob tezligi + navbatchilik + tuman mosligi.
 * Reyting asosiy omil, javob tezligi ikkinchi darajali.
 */
export function candidateScore(c: Candidate, ctx: { districtId?: string | null }): number {
  const PRIOR_WEIGHT = 3;
  const PRIOR_MEAN = 4.3;
  const rating = c.reviewCount > 0 ? (PRIOR_WEIGHT * PRIOR_MEAN + c.rating * c.reviewCount) / (PRIOR_WEIGHT + c.reviewCount) : PRIOR_MEAN;
  const mins = c.avgResponseMins ?? 60;
  const speed = Math.max(0, 1 - Math.min(mins, 240) / 240); // 0..1, tezroq — yaxshiroq
  const duty = c.isOnDuty ? 0.3 : 0;
  const sameDistrict = ctx.districtId && c.districtId === ctx.districtId ? 0.25 : 0;
  return rating + speed * 0.6 + duty + sameDistrict;
}

export function rankCandidates<T extends Candidate>(candidates: T[], ctx: { districtId?: string | null } = {}): T[] {
  return [...candidates].sort((a, b) => candidateScore(b, ctx) - candidateScore(a, ctx) || a.id.localeCompare(b.id));
}

/** Keyingi guruhni tanlash: avval yuborilganlar chiqarib tashlanadi */
export function pickBatch<T extends Candidate>(
  candidates: T[],
  opts: { exclude?: Iterable<string>; batchSize?: number; districtId?: string | null },
): T[] {
  const ex = new Set(opts.exclude ?? []);
  return rankCandidates(
    candidates.filter((c) => !ex.has(c.id)),
    { districtId: opts.districtId },
  ).slice(0, opts.batchSize ?? MATCHING_DEFAULTS.batchSize);
}

export function isDispatchExpired(lastDispatchAt: Date | null, now: Date, timeoutHours = MATCHING_DEFAULTS.timeoutHours) {
  if (!lastDispatchAt) return true;
  return now.getTime() - lastDispatchAt.getTime() >= timeoutHours * 3600_000;
}

export function needsAdminAlert(
  r: { status: RequestStatus; createdAt: Date; adminAlertedAt: Date | null },
  now: Date,
  hours = MATCHING_DEFAULTS.adminAlertHours,
) {
  return (
    (r.status === "YANGI" || r.status === "YUBORILDI") &&
    !r.adminAlertedAt &&
    now.getTime() - r.createdAt.getTime() >= hours * 3600_000
  );
}

/** Ruxsat etilgan holat oʻtishlari */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  YANGI: ["YUBORILDI", "BEKOR_QILINDI"],
  YUBORILDI: ["QABUL_QILINDI", "BEKOR_QILINDI", "YUBORILDI"],
  QABUL_QILINDI: ["JARAYONDA", "YOPILDI", "BEKOR_QILINDI"],
  JARAYONDA: ["YOPILDI", "BEKOR_QILINDI"],
  YOPILDI: [],
  BEKOR_QILINDI: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return TRANSITIONS[from].includes(to);
}

/** Yangi javob vaqti bilan oʻrtacha javob vaqtini yangilash (eksponensial silliqlash) */
export function updateAvgResponse(prev: number | null, minutes: number, alpha = 0.3) {
  const m = Math.max(0, Math.round(minutes));
  return prev == null ? m : Math.round(prev * (1 - alpha) + m * alpha);
}
