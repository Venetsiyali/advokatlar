import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const lawyerCardInclude = {
  region: true,
  district: true,
  specializations: { include: { specialization: true } },
} satisfies Prisma.LawyerProfileInclude;

export type LawyerCardData = Prisma.LawyerProfileGetPayload<{ include: typeof lawyerCardInclude }>;

export const PAGE_SIZE = 12;

export type CatalogFilters = {
  region?: string;
  district?: string;
  spec?: string;
  exp?: number;
  rating?: number;
  lang?: string;
  q?: string;
  sort?: "rating" | "experience" | "reviews";
  page?: number;
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) || undefined;
  const num = (k: string) => {
    const v = Number(one(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const sort = one("sort");
  return {
    region: one("viloyat"),
    district: one("tuman"),
    spec: one("yonalish"),
    exp: num("tajriba"),
    rating: num("reyting"),
    lang: one("til"),
    q: one("q")?.slice(0, 80),
    sort: sort === "experience" || sort === "reviews" ? sort : "rating",
    page: num("sahifa") ?? 1,
  };
}

export async function searchLawyers(f: CatalogFilters) {
  const where: Prisma.LawyerProfileWhereInput = {
    status: "TASDIQLANGAN",
    user: { isBlocked: false },
    ...(f.region && { region: { slug: f.region } }),
    ...(f.district && { district: { slug: f.district } }),
    ...(f.spec && { specializations: { some: { specialization: { slug: f.spec } } } }),
    ...(f.exp && { experienceYears: { gte: f.exp } }),
    ...(f.rating && { rating: { gte: f.rating } }),
    ...(f.lang && { languages: { has: f.lang } }),
    ...(f.q && {
      OR: [
        { fullName: { contains: f.q, mode: "insensitive" } },
        { workplace: { contains: f.q, mode: "insensitive" } },
      ],
    }),
  };
  const orderBy: Prisma.LawyerProfileOrderByWithRelationInput[] =
    f.sort === "experience"
      ? [{ experienceYears: "desc" }, { rating: "desc" }]
      : f.sort === "reviews"
        ? [{ reviewCount: "desc" }, { rating: "desc" }]
        : [{ rating: "desc" }, { reviewCount: "desc" }];
  const page = Math.max(1, f.page ?? 1);

  const [total, items] = await Promise.all([
    prisma.lawyerProfile.count({ where }),
    prisma.lawyerProfile.findMany({
      where,
      orderBy: [...orderBy, { id: "asc" }],
      include: lawyerCardInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, items, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getLawyerBySlug(slug: string) {
  return prisma.lawyerProfile.findUnique({
    where: { slug },
    include: {
      ...lawyerCardInclude,
      user: { select: { isBlocked: true } },
      reviews: { where: { status: "TASDIQLANGAN" }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

/**
 * Oyning TOP advokatlari: shu oy olingan baholar (koʻp boʻlsa — ustun) va umumiy reyting asosida.
 * Bayes-oʻrtacha: kam izohli advokat tasodifan yuqoriga chiqib ketmasligi uchun.
 */
export async function getTopLawyers({ limit = 5, from, regionId }: { limit?: number; from?: Date; regionId?: string } = {}) {
  const lawyers = await prisma.lawyerProfile.findMany({
    where: { status: "TASDIQLANGAN", user: { isBlocked: false }, reviewCount: { gt: 0 }, ...(regionId && { regionId }) },
    include: {
      ...lawyerCardInclude,
      reviews: {
        where: { status: "TASDIQLANGAN", ...(from && { createdAt: { gte: from } }) },
        select: { rating: true },
      },
    },
  });
  const C = 3; // ishonch vazni
  const M = 4.5; // oʻrtacha baho
  return lawyers
    .map((l) => {
      const n = l.reviews.length;
      const sum = l.reviews.reduce((a, r) => a + r.rating, 0);
      const score = (C * M + sum) / (C + n) + n * 0.01;
      return { lawyer: l, score, periodReviews: n };
    })
    .filter((x) => !from || x.periodReviews > 0)
    .sort((a, b) => b.score - a.score || b.lawyer.rating - a.lawyer.rating)
    .slice(0, limit);
}

export async function getHomeStats() {
  const [lawyers, requests, regions] = await Promise.all([
    prisma.lawyerProfile.count({ where: { status: "TASDIQLANGAN" } }),
    prisma.request.count({ where: { status: { in: ["QABUL_QILINDI", "JARAYONDA", "YOPILDI"] } } }),
    prisma.region.count(),
  ]);
  return { lawyers, requests, regions };
}

export const getRegions = () =>
  prisma.region.findMany({ orderBy: { sortOrder: "asc" }, include: { districts: { orderBy: { nameUz: "asc" } } } });

export const getSpecializations = () => prisma.specialization.findMany({ orderBy: { sortOrder: "asc" } });

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } }).catch(() => null);
  return (row?.value as T) ?? fallback;
}
