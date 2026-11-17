"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { ALLOWED_IMAGE_TYPES, publicUrl, storeFile } from "@/lib/storage";
import { STATIC_SLUGS } from "@/lib/static-pages";
import { latinToCyrillic, latinToCyrillicKeep, slugify } from "@/lib/translit";
import { site } from "@/lib/site";
import { audit, requireAdmin } from "./admin";
import { revalidatePublic } from "./cache";
import { pingArticle, pingLawyer, pingPage, pingTopic } from "./indexnow";
import type { ActionResult } from "./cabinet-actions";
import { adminAssign, adminCancel, adminRedispatch, recomputeLawyerRating } from "./matching";
import { notifyLawyerModeration } from "./notify";

const revalidateAll = revalidatePublic;

export type FormState = { status: "idle" } | { status: "ok"; id?: string } | { status: "error"; error: string; fields?: string[] };

const fail = (error: string, fields?: string[]): FormState => ({ status: "error", error, fields });
const issuesToFields = (e: z.ZodError) => [...new Set(e.issues.map((i) => String(i.path[0])))];

// ---------------- Advokatlar ----------------

export async function approveLawyerAction(lawyerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const l = await prisma.lawyerProfile.findUnique({ where: { id: lawyerId } });
  if (!l) return { ok: false, error: "NOT_FOUND" };
  if (!l.fullName || !l.regionId || !l.licenseNumber) return { ok: false, error: "INCOMPLETE" };
  await prisma.lawyerProfile.update({ where: { id: lawyerId }, data: { status: "TASDIQLANGAN", rejectReason: null } });
  await audit(admin.id, "lawyer.approve", "LawyerProfile", lawyerId, { from: l.status });
  await notifyLawyerModeration(lawyerId, "approved");
  revalidateAll();
  pingLawyer(lawyerId);
  return { ok: true };
}

export async function rejectLawyerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ lawyerId: z.string().min(1).max(40), reason: z.string().trim().min(5).max(500) })
    .safeParse({ lawyerId: fd.get("lawyerId"), reason: fd.get("reason") });
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const { lawyerId, reason } = parsed.data;
  const l = await prisma.lawyerProfile.findUnique({ where: { id: lawyerId } });
  if (!l) return fail("NOT_FOUND");
  await prisma.lawyerProfile.update({ where: { id: lawyerId }, data: { status: "RAD", rejectReason: reason, isOnDuty: false } });
  await audit(admin.id, "lawyer.reject", "LawyerProfile", lawyerId, { from: l.status, reason });
  await notifyLawyerModeration(lawyerId, "rejected", reason);
  revalidateAll();
  // Avval ochiq boʻlgan profil yopildi — qidiruv tizimlari 404 ni tezroq koʻrsin
  if (l.status === "TASDIQLANGAN") pingLawyer(lawyerId);
  return { status: "ok" };
}

export async function blockLawyerAction(lawyerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const l = await prisma.lawyerProfile.findUnique({ where: { id: lawyerId } });
  if (!l) return { ok: false, error: "NOT_FOUND" };
  await prisma.lawyerProfile.update({ where: { id: lawyerId }, data: { status: "BLOK", isOnDuty: false } });
  await audit(admin.id, "lawyer.block", "LawyerProfile", lawyerId, { from: l.status });
  await notifyLawyerModeration(lawyerId, "blocked");
  revalidateAll();
  if (l.status === "TASDIQLANGAN") pingLawyer(lawyerId);
  return { ok: true };
}

export async function setLicenseVerifiedAction(lawyerId: string, verified: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.lawyerProfile.update({ where: { id: lawyerId }, data: { licenseVerified: verified } });
  await audit(admin.id, verified ? "lawyer.license_verify" : "lawyer.license_unverify", "LawyerProfile", lawyerId);
  revalidateAll();
  pingLawyer(lawyerId);
  return { ok: true };
}

/** Obunani qoʻlda uzaytirish (masalan, naqd/bank orqali toʻlov) */
export async function extendSubscriptionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ lawyerId: z.string().min(1).max(40), days: z.coerce.number().int().min(1).max(366) })
    .safeParse({ lawyerId: fd.get("lawyerId"), days: fd.get("days") });
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const { lawyerId, days } = parsed.data;
  const now = new Date();
  const sub = await prisma.subscription.findUnique({ where: { lawyerId } });
  const base = sub && sub.endsAt > now ? sub.endsAt : now;
  const endsAt = new Date(base.getTime() + days * 86400_000);
  await prisma.subscription.upsert({
    where: { lawyerId },
    update: { status: "FAOL", endsAt, remindedAt: null },
    create: { lawyerId, status: "FAOL", startsAt: now, endsAt },
  });
  await audit(admin.id, "subscription.extend", "Subscription", lawyerId, { days, endsAt: endsAt.toISOString() });
  revalidateAll();
  return { status: "ok" };
}

// ---------------- Foydalanuvchilar ----------------

export async function setUserBlockedAction(userId: string, blocked: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "SELF" };
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { lawyerProfile: true } });
  if (!u) return { ok: false, error: "NOT_FOUND" };
  await prisma.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  if (blocked && u.lawyerProfile) await prisma.lawyerProfile.update({ where: { id: u.lawyerProfile.id }, data: { isOnDuty: false } });
  await audit(admin.id, blocked ? "user.block" : "user.unblock", "User", userId);
  revalidateAll();
  return { ok: true };
}

// ---------------- Murojaatlar ----------------

export async function adminAssignAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const requestId = String(fd.get("requestId") ?? "");
  const lawyerId = String(fd.get("lawyerId") ?? "");
  if (!requestId || !lawyerId) return fail("VALIDATION", ["lawyerId"]);
  const res = await adminAssign(requestId, lawyerId);
  if (!res.ok) return fail(res.reason);
  await audit(admin.id, "request.assign", "Request", requestId, { lawyerId });
  revalidateAll();
  return { status: "ok" };
}

export async function adminRedispatchAction(requestId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const res = await adminRedispatch(requestId);
  if (!res.ok) return { ok: false, error: "CLOSED" };
  await audit(admin.id, "request.redispatch", "Request", requestId, { sent: res.sent });
  revalidateAll();
  return res.sent > 0 ? { ok: true } : { ok: false, error: "NO_LAWYERS" };
}

export async function adminCancelAction(requestId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const res = await adminCancel(requestId);
  if (!res.ok) return { ok: false, error: "CLOSED" };
  await audit(admin.id, "request.cancel", "Request", requestId);
  revalidateAll();
  return { ok: true };
}

// ---------------- Izohlar ----------------

export async function moderateReviewAction(reviewId: string, status: "TASDIQLANGAN" | "RAD"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (status !== "TASDIQLANGAN" && status !== "RAD") return { ok: false, error: "BAD" };
  const r = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!r) return { ok: false, error: "NOT_FOUND" };
  await prisma.review.update({ where: { id: reviewId }, data: { status } });
  await recomputeLawyerRating(r.lawyerId);
  await audit(admin.id, status === "TASDIQLANGAN" ? "review.approve" : "review.reject", "Review", reviewId, { from: r.status });
  revalidateAll();
  pingLawyer(r.lawyerId);
  return { ok: true };
}

// ---------------- Maqolalar ----------------

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const ArticleSchema = z.object({
  id: z.string().max(40).optional().default(""),
  title: z.string().trim().min(5).max(200),
  slug: z.union([slugSchema, z.literal("")]),
  locale: z.enum(["uz", "uz_Cyrl", "ru"]),
  excerpt: z.string().trim().max(400).optional().default(""),
  content: z.string().max(200_000),
  published: z.boolean(),
});

async function maybeCover(fd: FormData, field = "cover") {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return publicUrl((await storeFile(file, "public/covers", ALLOWED_IMAGE_TYPES)).key);
}

export async function saveArticleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = ArticleSchema.safeParse({
    id: fd.get("id") ?? "",
    title: fd.get("title"),
    slug: fd.get("slug") ?? "",
    locale: fd.get("locale"),
    excerpt: fd.get("excerpt") ?? "",
    content: fd.get("content") ?? "",
    published: fd.get("published") === "on",
  });
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const d = parsed.data;
  const content = sanitizeRichHtml(d.content);
  if (content.replace(/<[^>]+>/g, "").trim().length < 20) return fail("VALIDATION", ["content"]);
  const slug = d.slug || slugify(d.title);
  if (!slug) return fail("VALIDATION", ["slug"]);

  const clash = await prisma.article.findFirst({ where: { slug, ...(d.id && { id: { not: d.id } }) }, select: { id: true } });
  if (clash) return fail("SLUG_TAKEN", ["slug"]);

  let coverUrl: string | undefined;
  try {
    coverUrl = await maybeCover(fd);
  } catch {
    return fail("FILE", ["cover"]);
  }

  const existing = d.id ? await prisma.article.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existing) return fail("NOT_FOUND");
  const data = {
    title: d.title,
    slug,
    locale: d.locale,
    excerpt: d.excerpt || null,
    content,
    published: d.published,
    publishedAt: d.published ? (existing?.publishedAt ?? new Date()) : null,
    ...(coverUrl && { coverUrl }),
    ...(fd.get("removeCover") === "on" && !coverUrl && { coverUrl: null }),
  };
  const saved = existing
    ? await prisma.article.update({ where: { id: existing.id }, data })
    : await prisma.article.create({ data: { ...data, authorId: admin.id } });
  await audit(admin.id, existing ? "article.update" : "article.create", "Article", saved.id, { slug, published: d.published });
  revalidateAll();
  // Eʼlon qilingan yoki eʼlondan olingan maqola; slug oʻzgargan boʻlsa — eski manzil ham
  if (saved.published || existing?.published) pingArticle(saved.slug, saved.locale);
  if (existing?.published && existing.slug !== saved.slug) pingArticle(existing.slug, existing.locale);
  return { status: "ok", id: saved.id };
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) return { ok: false, error: "NOT_FOUND" };
  await prisma.article.delete({ where: { id } });
  await audit(admin.id, "article.delete", "Article", id, { slug: a.slug, title: a.title });
  revalidateAll();
  if (a.published) pingArticle(a.slug, a.locale);
  return { ok: true };
}

// ---------------- Mavzu sahifalari ----------------

const TopicSchema = z.object({
  id: z.string().max(40).optional().default(""),
  slug: slugSchema.min(2),
  title: z.string().trim().min(3).max(120),
  titleUzCyrl: z.string().trim().max(120).optional().default(""),
  titleRu: z.string().trim().max(120).optional().default(""),
  summary: z.string().trim().max(300).optional().default(""),
  summaryRu: z.string().trim().max(300).optional().default(""),
  content: z.string().max(200_000),
  contentRu: z.string().max(200_000).optional().default(""),
  icon: z.string().trim().max(40).optional().default(""),
  specializationId: z.string().max(40).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  showOnHome: z.boolean(),
  published: z.boolean(),
});

export async function saveTopicAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = TopicSchema.safeParse({
    ...Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")),
    showOnHome: fd.get("showOnHome") === "on",
    published: fd.get("published") === "on",
  });
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const d = parsed.data;
  const content = sanitizeRichHtml(d.content);
  if (content.replace(/<[^>]+>/g, "").trim().length < 20) return fail("VALIDATION", ["content"]);
  const clash = await prisma.topicPage.findFirst({ where: { slug: d.slug, ...(d.id && { id: { not: d.id } }) }, select: { id: true } });
  if (clash) return fail("SLUG_TAKEN", ["slug"]);
  if (d.specializationId && !(await prisma.specialization.findUnique({ where: { id: d.specializationId } }))) {
    return fail("VALIDATION", ["specializationId"]);
  }
  const data = {
    slug: d.slug,
    title: d.title,
    titleUzCyrl: d.titleUzCyrl || latinToCyrillic(d.title),
    titleRu: d.titleRu || null,
    summary: d.summary || null,
    summaryRu: d.summaryRu || null,
    content,
    contentRu: d.contentRu.replace(/<[^>]+>/g, "").trim() ? sanitizeRichHtml(d.contentRu) : null,
    icon: d.icon || null,
    specializationId: d.specializationId || null,
    sortOrder: d.sortOrder,
    showOnHome: d.showOnHome,
    published: d.published,
  };
  if (d.id && !(await prisma.topicPage.findUnique({ where: { id: d.id } }))) return fail("NOT_FOUND");
  const saved = d.id ? await prisma.topicPage.update({ where: { id: d.id }, data }) : await prisma.topicPage.create({ data });
  await audit(admin.id, d.id ? "topic.update" : "topic.create", "TopicPage", saved.id, { slug: d.slug });
  revalidateAll();
  if (saved.published || d.id) pingTopic(saved.slug);
  return { status: "ok", id: saved.id };
}

export async function deleteTopicAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const tp = await prisma.topicPage.findUnique({ where: { id } });
  if (!tp) return { ok: false, error: "NOT_FOUND" };
  await prisma.topicPage.delete({ where: { id } });
  await audit(admin.id, "topic.delete", "TopicPage", id, { slug: tp.slug });
  revalidateAll();
  if (tp.published) pingTopic(tp.slug);
  return { ok: true };
}

// ---------------- Maʼlumot sahifalari ----------------

const StaticSchema = z.object({
  slug: z.enum(STATIC_SLUGS),
  titleUz: z.string().trim().min(2).max(150),
  titleUzCyrl: z.string().trim().max(150).optional().default(""),
  titleRu: z.string().trim().min(2).max(150),
  contentUz: z.string().max(300_000),
  contentUzCyrl: z.string().max(300_000).optional().default(""),
  contentRu: z.string().max(300_000),
});

export async function saveStaticPageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = StaticSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const d = parsed.data;
  const contentUz = sanitizeRichHtml(d.contentUz);
  const contentRu = sanitizeRichHtml(d.contentRu);
  // Kirill matni boʻsh qoldirilsa — lotinchadan avtomatik
  const contentUzCyrl = d.contentUzCyrl.replace(/<[^>]+>/g, "").trim() ? sanitizeRichHtml(d.contentUzCyrl) : latinToCyrillicKeep(contentUz, [site.brand]);
  const data = {
    titleUz: d.titleUz,
    titleUzCyrl: d.titleUzCyrl || latinToCyrillicKeep(d.titleUz, [site.brand]),
    titleRu: d.titleRu,
    contentUz,
    contentUzCyrl,
    contentRu,
  };
  await prisma.staticPage.upsert({ where: { slug: d.slug }, update: data, create: { slug: d.slug, ...data } });
  await audit(admin.id, "page.update", "StaticPage", d.slug);
  revalidateAll();
  pingPage(d.slug);
  return { status: "ok" };
}

// ---------------- Sozlamalar va tariflar ----------------

const SettingsSchema = z.object({
  trialDays: z.coerce.number().int().min(0).max(365),
  trialDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dispatchBatchSize: z.coerce.number().int().min(1).max(10),
  dispatchTimeoutHours: z.coerce.number().int().min(1).max(48),
  adminAlertHours: z.coerce.number().int().min(1).max(168),
});

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = SettingsSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const before = await prisma.setting.findMany({ where: { key: { in: Object.keys(parsed.data) } } });
  await prisma.$transaction(
    Object.entries(parsed.data).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  );
  await audit(admin.id, "settings.update", "Setting", null, {
    before: Object.fromEntries(before.map((r) => [r.key, r.value])),
    after: parsed.data,
  });
  revalidateAll();
  return { status: "ok" };
}

const PlanSchema = z.object({
  id: z.string().min(1).max(40),
  nameUz: z.string().trim().min(2).max(80),
  nameUzCyrl: z.string().trim().max(80).optional().default(""),
  nameRu: z.string().trim().min(2).max(80),
  priceUzs: z.coerce.number().int().min(0).max(100_000_000),
  periodDays: z.coerce.number().int().min(1).max(366),
  features: z.string().max(2000).optional().default(""),
  isActive: z.boolean(),
});

export async function savePlanAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = PlanSchema.safeParse({
    ...Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")),
    isActive: fd.get("isActive") === "on",
  });
  if (!parsed.success) return fail("VALIDATION", issuesToFields(parsed.error));
  const d = parsed.data;
  const plan = await prisma.plan.findUnique({ where: { id: d.id } });
  if (!plan) return fail("NOT_FOUND");
  const features = d.features
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  await prisma.plan.update({
    where: { id: d.id },
    data: {
      nameUz: d.nameUz,
      nameUzCyrl: d.nameUzCyrl || latinToCyrillic(d.nameUz),
      nameRu: d.nameRu,
      priceUzs: d.priceUzs,
      periodDays: d.periodDays,
      isActive: d.isActive,
      features,
    },
  });
  // Bosh sahifa va narxlar sahifasidagi narx asosiy tarifdan olinadi
  if (plan.slug === "oylik") {
    await prisma.setting.upsert({
      where: { key: "monthlyPriceUzs" },
      update: { value: d.priceUzs },
      create: { key: "monthlyPriceUzs", value: d.priceUzs },
    });
  }
  await audit(admin.id, "plan.update", "Plan", d.id, { before: { priceUzs: plan.priceUzs, periodDays: plan.periodDays }, after: { priceUzs: d.priceUzs, periodDays: d.periodDays } });
  revalidateAll();
  return { status: "ok" };
}
