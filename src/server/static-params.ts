import "server-only";
import { prisma } from "@/lib/db";

/**
 * generateStaticParams uchun: sahifalar build vaqtida bazadagi roʻyxat boʻyicha oldindan tayyorlanadi —
 * birinchi tashrifdayoq keshdan beriladi. Baza boʻlmasa (Docker build: BUILD_WITHOUT_DB=1) yoki xato boʻlsa —
 * boʻsh roʻyxat: sahifalar birinchi soʻrovda generatsiya qilinadi (ISR).
 */
async function slugs<T>(load: () => Promise<T[]>): Promise<T[]> {
  if (process.env.BUILD_WITHOUT_DB === "1") return [];
  try {
    return await load();
  } catch (e) {
    console.warn("[static-params] baza oʻqilmadi, sahifalar birinchi soʻrovda generatsiya qilinadi:", (e as Error).message.split("\n")[0]);
    return [];
  }
}

export const regionParams = () => slugs(async () => (await prisma.region.findMany({ select: { slug: true } })).map((r) => ({ viloyat: r.slug })));

export const specParams = () => slugs(async () => (await prisma.specialization.findMany({ select: { slug: true } })).map((s) => ({ slug: s.slug })));

export const topicParams = () =>
  slugs(async () => (await prisma.topicPage.findMany({ where: { published: true }, select: { slug: true } })).map((t) => ({ slug: t.slug })));

export const articleParams = () =>
  slugs(async () => (await prisma.article.findMany({ where: { published: true }, select: { slug: true } })).map((a) => ({ slug: a.slug })));

export const lawyerParams = () =>
  slugs(async () =>
    (
      await prisma.lawyerProfile.findMany({
        where: { status: "TASDIQLANGAN", user: { isBlocked: false } },
        select: { slug: true },
        orderBy: { rating: "desc" },
        take: 500,
      })
    ).map((l) => ({ slug: l.slug })),
  );
