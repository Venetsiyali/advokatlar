import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "./session";

/** Faqat ADMIN roli (bazadan tekshiriladi — JWT ga ishonilmaydi) */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

/** Har bir admin harakati AuditLog ga yoziladi */
export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, meta } });
}

export const ADMIN_PAGE_SIZE = 25;

export function pageParam(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function strParam(v: string | string[] | undefined, max = 80) {
  const s = (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  return s.slice(0, max);
}

/** Dashboard koʻrsatkichlari */
export async function getAdminStats(now = new Date()) {
  const dayAgo = new Date(now.getTime() - 86400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [pendingLawyers, approvedLawyers, openRequests, stuckRequests, pendingReviews, users, requests24h, activeSubs, revenue] =
    await Promise.all([
      prisma.lawyerProfile.count({ where: { status: "KUTILMOQDA" } }),
      prisma.lawyerProfile.count({ where: { status: "TASDIQLANGAN" } }),
      prisma.request.count({ where: { status: { in: ["YANGI", "YUBORILDI"] } } }),
      prisma.request.count({ where: { status: { in: ["YANGI", "YUBORILDI"] }, adminAlertedAt: { not: null } } }),
      prisma.review.count({ where: { status: "KUTILMOQDA" } }),
      prisma.user.count(),
      prisma.request.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.subscription.count({ where: { status: { in: ["SINOV", "FAOL"] }, endsAt: { gt: now } } }),
      prisma.payment.aggregate({ where: { status: "TOLANDI", paidAt: { gte: monthStart } }, _sum: { amountUzs: true } }),
    ]);
  const revenueMonth = revenue._sum.amountUzs ?? 0;
  return { pendingLawyers, approvedLawyers, openRequests, stuckRequests, pendingReviews, users, requests24h, activeSubs, revenueMonth };
}
