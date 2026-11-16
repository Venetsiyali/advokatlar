"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type ReviewState = { status: "idle" } | { status: "ok" } | { status: "error"; error: "invalid" | "already" | "validation" };

const Schema = z.object({
  token: z.string().min(10).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(""),
});

/** Yopilgan murojaat havolasi (bir martalik token) orqali baho qoldirish. Izoh moderatsiyaga tushadi. */
export async function submitReviewAction(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const parsed = Schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { status: "error", error: "validation" };
  if (!rateLimit(`review:${await clientIp()}`, 10, 3600_000).ok) return { status: "error", error: "validation" };

  const req = await prisma.request.findUnique({ where: { reviewToken: parsed.data.token }, include: { review: true } });
  if (!req || req.status !== "YOPILDI" || !req.assignedLawyerId) return { status: "error", error: "invalid" };
  if (req.review) return { status: "error", error: "already" };

  try {
    await prisma.review.create({
      data: {
        requestId: req.id,
        lawyerId: req.assignedLawyerId,
        authorId: req.clientId,
        authorName: shortName(req.name),
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
        status: "KUTILMOQDA",
      },
    });
  } catch {
    return { status: "error", error: "already" }; // unique(requestId) poygasi
  }
  return { status: "ok" };
}

/** “Sardor Yusupov” → “Sardor Y.” — maxfiylik uchun */
function shortName(name: string) {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
}
