import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  MATCHING_DEFAULTS,
  canTransition,
  isDispatchExpired,
  needsAdminAlert,
  pickBatch,
  updateAvgResponse,
} from "@/lib/matching-core";
import {
  notifyAdmin,
  notifyAdminNoLawyer,
  notifyAssignmentsTaken,
  notifyClientAccepted,
  notifyClientReviewLink,
  notifyLawyerAssignedByAdmin,
  notifyLawyerNewRequest,
} from "./notify";

async function settings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["dispatchBatchSize", "dispatchTimeoutHours", "adminAlertHours"] } },
  });
  const get = (k: string, d: number) => Number(rows.find((r) => r.key === k)?.value ?? d) || d;
  return {
    batchSize: get("dispatchBatchSize", MATCHING_DEFAULTS.batchSize),
    timeoutHours: get("dispatchTimeoutHours", MATCHING_DEFAULTS.timeoutHours),
    adminAlertHours: get("adminAlertHours", MATCHING_DEFAULTS.adminAlertHours),
  };
}

/** Murojaat olishi mumkin boʻlgan advokatlar: tasdiqlangan, bloklanmagan, obunasi faol, hudud+yoʻnalish mos */
export function eligibleLawyerWhere(regionId: string, specializationId: string, now = new Date()): Prisma.LawyerProfileWhereInput {
  return {
    status: "TASDIQLANGAN",
    regionId,
    user: { isBlocked: false },
    specializations: { some: { specializationId } },
    subscription: { status: { in: ["SINOV", "FAOL"] }, endsAt: { gt: now } },
  };
}

const requestNotifyInclude = { region: true, district: true, specialization: true } as const;

export function generateRequestCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return `M-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/**
 * Murojaatni keyingi advokatlar guruhiga yuborish.
 * 1-raundda, agar mijoz aniq advokatni tanlagan boʻlsa va u murojaat qabul qila olsa — faqat unga.
 */
export async function dispatchRequest(requestId: string, now = new Date()) {
  const cfg = await settings();
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { ...requestNotifyInclude, assignments: { select: { lawyerId: true } } },
  });
  if (!req || (req.status !== "YANGI" && req.status !== "YUBORILDI")) return { sent: 0 };

  const where = eligibleLawyerWhere(req.regionId, req.specializationId, now);
  const exclude = req.assignments.map((a) => a.lawyerId);
  let batch: { id: string; userId: string }[] = [];

  if (req.dispatchRound === 0 && req.targetLawyerId) {
    const target = await prisma.lawyerProfile.findFirst({
      where: {
        id: req.targetLawyerId,
        status: "TASDIQLANGAN",
        user: { isBlocked: false },
        subscription: { status: { in: ["SINOV", "FAOL"] }, endsAt: { gt: now } },
      },
      select: { id: true, userId: true },
    });
    if (target) batch = [target];
  }

  if (batch.length === 0) {
    const candidates = await prisma.lawyerProfile.findMany({
      where: { ...where, id: { notIn: exclude } },
      select: { id: true, userId: true, rating: true, reviewCount: true, avgResponseMins: true, isOnDuty: true, districtId: true },
    });
    batch = pickBatch(candidates, { exclude, batchSize: cfg.batchSize, districtId: req.districtId });
  }

  if (batch.length === 0) {
    // Hech kim qolmadi — adminga bir marta xabar
    if (!req.adminAlertedAt) {
      await prisma.request.update({ where: { id: req.id }, data: { adminAlertedAt: now, lastDispatchAt: now } });
      await notifyAdminNoLawyer(req);
    } else {
      await prisma.request.update({ where: { id: req.id }, data: { lastDispatchAt: now } });
    }
    return { sent: 0 };
  }

  const round = req.dispatchRound + 1;
  const created = await prisma.$transaction(async (tx) => {
    // Poyga holatidan himoya: murojaat hali ham yuborilishi mumkinligini tekshiramiz
    const upd = await tx.request.updateMany({
      where: { id: req.id, status: { in: ["YANGI", "YUBORILDI"] }, dispatchRound: req.dispatchRound },
      data: { status: "YUBORILDI", dispatchRound: round, lastDispatchAt: now },
    });
    if (upd.count === 0) return [];
    return Promise.all(
      batch.map((l) =>
        tx.requestAssignment.create({ data: { requestId: req.id, lawyerId: l.id, round, sentAt: now }, select: { id: true, lawyerId: true } }),
      ),
    );
  });

  await Promise.all(
    created.map((a) => notifyLawyerNewRequest(a.id, batch.find((b) => b.id === a.lawyerId)!.userId, req)),
  );
  return { sent: created.length, round };
}

export type AcceptResult = { ok: true; requestId: string } | { ok: false; reason: "NOT_FOUND" | "TAKEN" | "INACTIVE" };

/** Birinchi “Qabul qildim” bosgan advokat gʻolib — shartli UPDATE orqali atomik */
export async function acceptAssignment(assignmentId: string, lawyerId: string, now = new Date()): Promise<AcceptResult> {
  const a = await prisma.requestAssignment.findFirst({
    where: { id: assignmentId, lawyerId },
    include: { lawyer: { include: { subscription: true } } },
  });
  if (!a || a.status !== "YUBORILDI") return { ok: false, reason: "NOT_FOUND" };
  const sub = a.lawyer.subscription;
  if (a.lawyer.status !== "TASDIQLANGAN" || !sub || !["SINOV", "FAOL"].includes(sub.status) || sub.endsAt <= now) {
    return { ok: false, reason: "INACTIVE" };
  }

  const won = await prisma.$transaction(async (tx) => {
    const upd = await tx.request.updateMany({
      where: { id: a.requestId, status: "YUBORILDI", assignedLawyerId: null },
      data: { status: "QABUL_QILINDI", assignedLawyerId: lawyerId, acceptedAt: now },
    });
    if (upd.count === 0) {
      await tx.requestAssignment.update({ where: { id: a.id }, data: { status: "BAND_QILINGAN" } });
      return false;
    }
    await tx.requestAssignment.update({ where: { id: a.id }, data: { status: "QABUL_QILDI", respondedAt: now } });
    await tx.requestAssignment.updateMany({
      where: { requestId: a.requestId, id: { not: a.id }, status: "YUBORILDI" },
      data: { status: "BAND_QILINGAN" },
    });
    const mins = (now.getTime() - a.sentAt.getTime()) / 60_000;
    await tx.lawyerProfile.update({
      where: { id: lawyerId },
      data: { avgResponseMins: updateAvgResponse(a.lawyer.avgResponseMins, mins) },
    });
    return true;
  });
  if (!won) return { ok: false, reason: "TAKEN" };

  await Promise.all([notifyAssignmentsTaken(a.requestId, lawyerId), notifyClientAccepted(a.requestId, a.lawyer.fullName)]);
  return { ok: true, requestId: a.requestId };
}

/** Rad etish; joriy raundda hamma rad etsa — darhol keyingi guruhga */
export async function rejectAssignment(assignmentId: string, lawyerId: string, now = new Date()) {
  const a = await prisma.requestAssignment.findFirst({ where: { id: assignmentId, lawyerId, status: "YUBORILDI" } });
  if (!a) return { ok: false as const };
  await prisma.requestAssignment.update({ where: { id: a.id }, data: { status: "RAD_ETDI", respondedAt: now } });
  const pending = await prisma.requestAssignment.count({ where: { requestId: a.requestId, status: "YUBORILDI" } });
  if (pending === 0) await dispatchRequest(a.requestId, now);
  return { ok: true as const };
}

/** Advokat tomonidan holatni oʻzgartirish: JARAYONDA yoki YOPILDI */
export async function lawyerSetStatus(requestId: string, lawyerId: string, to: "JARAYONDA" | "YOPILDI", now = new Date()) {
  const req = await prisma.request.findFirst({ where: { id: requestId, assignedLawyerId: lawyerId } });
  if (!req || !canTransition(req.status, to)) return { ok: false as const };
  const reviewToken = to === "YOPILDI" ? randomBytes(18).toString("base64url") : undefined;
  const upd = await prisma.request.updateMany({
    where: { id: req.id, status: req.status },
    data: { status: to, ...(to === "YOPILDI" && { closedAt: now, reviewToken }) },
  });
  if (upd.count === 0) return { ok: false as const };
  if (reviewToken) await notifyClientReviewLink(req.id);
  return { ok: true as const };
}

/** Mijoz murojaatini bekor qilish */
export async function clientCancel(requestId: string, clientId: string) {
  const req = await prisma.request.findFirst({ where: { id: requestId, clientId } });
  if (!req || !canTransition(req.status, "BEKOR_QILINDI")) return { ok: false as const };
  await prisma.$transaction([
    prisma.request.update({ where: { id: req.id }, data: { status: "BEKOR_QILINDI", closedAt: new Date() } }),
    prisma.requestAssignment.updateMany({ where: { requestId: req.id, status: "YUBORILDI" }, data: { status: "MUDDATI_OTDI" } }),
  ]);
  return { ok: true as const };
}

/**
 * Davriy vazifa (har 5 daqiqada): 2 soat javobsiz qolgan murojaatlarni keyingi guruhga yuborish,
 * 24 soatdan oshganlari haqida adminga signal.
 */
export async function processTimeouts(now = new Date()) {
  const cfg = await settings();
  const open = await prisma.request.findMany({
    where: { status: { in: ["YANGI", "YUBORILDI"] } },
    select: { id: true, code: true, status: true, createdAt: true, lastDispatchAt: true, adminAlertedAt: true },
    take: 500,
  });
  let redispatched = 0;
  let alerted = 0;
  for (const r of open) {
    if (isDispatchExpired(r.lastDispatchAt, now, cfg.timeoutHours)) {
      await prisma.requestAssignment.updateMany({
        where: { requestId: r.id, status: "YUBORILDI" },
        data: { status: "MUDDATI_OTDI" },
      });
      const res = await dispatchRequest(r.id, now);
      if (res.sent > 0) redispatched++;
    }
    const fresh = await prisma.request.findUnique({ where: { id: r.id }, select: { status: true, createdAt: true, adminAlertedAt: true } });
    if (fresh && needsAdminAlert(fresh, now, cfg.adminAlertHours)) {
      await prisma.request.update({ where: { id: r.id }, data: { adminAlertedAt: now } });
      await notifyAdmin("adminTimeout", { code: r.code, hours: cfg.adminAlertHours });
      alerted++;
    }
  }
  return { checked: open.length, redispatched, alerted };
}

/** Advokat reytingini tasdiqlangan izohlar asosida qayta hisoblash */
export async function recomputeLawyerRating(lawyerId: string) {
  const agg = await prisma.review.aggregate({
    where: { lawyerId, status: "TASDIQLANGAN" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.lawyerProfile.update({
    where: { id: lawyerId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  });
}

// ---------- Admin amallari ----------

/**
 * Admin murojaatni tanlangan advokatga qoʻlda biriktiradi (obuna/hudud shartlarisiz — admin qarori).
 * Ochiq (YANGI/YUBORILDI) yoki allaqachon biriktirilgan (QABUL_QILINDI/JARAYONDA) murojaatlar uchun.
 */
export async function adminAssign(requestId: string, lawyerId: string, now = new Date()) {
  const [req, lawyer] = await Promise.all([
    prisma.request.findUnique({ where: { id: requestId } }),
    prisma.lawyerProfile.findFirst({ where: { id: lawyerId, status: "TASDIQLANGAN", user: { isBlocked: false } } }),
  ]);
  if (!req || !lawyer) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (!["YANGI", "YUBORILDI", "QABUL_QILINDI", "JARAYONDA"].includes(req.status)) return { ok: false as const, reason: "CLOSED" as const };
  if (req.assignedLawyerId === lawyerId) return { ok: false as const, reason: "SAME" as const };

  const ok = await prisma.$transaction(async (tx) => {
    const upd = await tx.request.updateMany({
      where: { id: req.id, status: req.status, assignedLawyerId: req.assignedLawyerId },
      data: { status: "QABUL_QILINDI", assignedLawyerId: lawyerId, acceptedAt: now },
    });
    if (upd.count === 0) return false;
    // Avvalgi biriktirish va kutilayotgan yuborishlar yopiladi
    await tx.requestAssignment.updateMany({
      where: { requestId: req.id, lawyerId: { not: lawyerId }, status: { in: ["YUBORILDI", "QABUL_QILDI"] } },
      data: { status: "BAND_QILINGAN" },
    });
    await tx.requestAssignment.upsert({
      where: { requestId_lawyerId: { requestId: req.id, lawyerId } },
      update: { status: "QABUL_QILDI", respondedAt: now },
      create: { requestId: req.id, lawyerId, round: req.dispatchRound, status: "QABUL_QILDI", sentAt: now, respondedAt: now },
    });
    return true;
  });
  if (!ok) return { ok: false as const, reason: "CONFLICT" as const };

  await Promise.all([
    notifyLawyerAssignedByAdmin(req.id),
    notifyClientAccepted(req.id, lawyer.fullName),
    // Kartani olgan boshqa advokatlarning Telegram xabarlari “band qilindi” ga oʻzgaradi
    notifyAssignmentsTaken(req.id, lawyerId),
  ]);
  return { ok: true as const };
}

/** Kutilayotgan yuborishlarni yopib, darhol keyingi guruhga yuborish */
export async function adminRedispatch(requestId: string, now = new Date()) {
  const req = await prisma.request.findUnique({ where: { id: requestId } });
  if (!req || (req.status !== "YANGI" && req.status !== "YUBORILDI")) return { ok: false as const, sent: 0 };
  await prisma.requestAssignment.updateMany({ where: { requestId, status: "YUBORILDI" }, data: { status: "MUDDATI_OTDI" } });
  const res = await dispatchRequest(requestId, now);
  return { ok: true as const, sent: res.sent };
}

/** Admin tomonidan bekor qilish (spam, takroriy murojaat) */
export async function adminCancel(requestId: string, now = new Date()) {
  const req = await prisma.request.findUnique({ where: { id: requestId } });
  if (!req || !canTransition(req.status, "BEKOR_QILINDI")) return { ok: false as const };
  await prisma.$transaction([
    prisma.request.update({ where: { id: req.id }, data: { status: "BEKOR_QILINDI", closedAt: now } }),
    prisma.requestAssignment.updateMany({ where: { requestId: req.id, status: "YUBORILDI" }, data: { status: "MUDDATI_OTDI" } }),
  ]);
  return { ok: true as const };
}
