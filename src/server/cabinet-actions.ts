"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { ALLOWED_DOC_TYPES, ALLOWED_IMAGE_TYPES, deleteFile, publicUrl, storeFile } from "@/lib/storage";
import { acceptAssignment, clientCancel, lawyerSetStatus, rejectAssignment } from "./matching";
import { getCurrentUser } from "./session";
import { revalidatePublic } from "./cache";

async function requireLawyer() {
  const user = await getCurrentUser();
  if (!user || user.role !== "LAWYER" || !user.lawyerProfile) throw new Error("FORBIDDEN");
  return { user, lawyer: user.lawyerProfile };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

// ---------- Murojaatlar (advokat) ----------

export async function acceptAction(assignmentId: string): Promise<ActionResult> {
  const { lawyer } = await requireLawyer();
  const res = await acceptAssignment(assignmentId, lawyer.id);
  revalidatePath("/[locale]/kabinet", "layout");
  return res.ok ? { ok: true } : { ok: false, error: res.reason };
}

export async function rejectAction(assignmentId: string): Promise<ActionResult> {
  const { lawyer } = await requireLawyer();
  const res = await rejectAssignment(assignmentId, lawyer.id);
  revalidatePath("/[locale]/kabinet", "layout");
  return res.ok ? { ok: true } : { ok: false, error: "NOT_FOUND" };
}

export async function setRequestStatusAction(requestId: string, to: "JARAYONDA" | "YOPILDI"): Promise<ActionResult> {
  const { lawyer } = await requireLawyer();
  if (to !== "JARAYONDA" && to !== "YOPILDI") return { ok: false, error: "BAD" };
  const res = await lawyerSetStatus(requestId, lawyer.id, to);
  revalidatePath("/[locale]/kabinet", "layout");
  return res.ok ? { ok: true } : { ok: false, error: "BAD_TRANSITION" };
}

export async function toggleDutyAction(): Promise<ActionResult> {
  const { lawyer } = await requireLawyer();
  await prisma.lawyerProfile.update({ where: { id: lawyer.id }, data: { isOnDuty: !lawyer.isOnDuty } });
  // Ochiq sahifalardagi (ISR) advokat kartalari ham yangilansin
  revalidatePublic();
  return { ok: true };
}

/** Telegram bot bilan bogʻlash uchun bir martalik kod (3-bosqichdagi bot uni qabul qiladi) */
export async function telegramLinkCodeAction(): Promise<{ code: string }> {
  const { lawyer } = await requireLawyer();
  const code = randomBytes(4).toString("hex").toUpperCase();
  await prisma.lawyerProfile.update({ where: { id: lawyer.id }, data: { telegramLinkCode: code } });
  return { code };
}

// ---------- Profil ----------

const ProfileSchema = z.object({
  fullName: z.string().trim().min(5).max(120),
  bio: z.string().trim().max(2000).optional().default(""),
  education: z.string().trim().max(300).optional().default(""),
  workplace: z.string().trim().max(200).optional().default(""),
  experienceYears: z.coerce.number().int().min(0).max(70),
  licenseNumber: z.string().trim().min(3).max(40),
  consultationFee: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(/\D/g, "")) || null : null)),
  regionId: z.string().min(1).max(40),
  districtId: z.string().max(40).optional().default(""),
  languages: z.array(z.enum(["uz", "ru", "en", "kaa", "tg"])).min(1),
  specializations: z.array(z.string().max(40)).min(1).max(8),
});

export type ProfileState = { status: "idle" } | { status: "ok" } | { status: "error"; error: "VALIDATION" | "FILE"; fields?: string[] };

export async function saveProfileAction(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const { user, lawyer } = await requireLawyer();
  const raw = {
    ...Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")),
    languages: fd.getAll("languages"),
    specializations: fd.getAll("specializations"),
  };
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", error: "VALIDATION", fields: parsed.error.issues.map((i) => String(i.path[0])) };
  const d = parsed.data;

  const [region, district, specs] = await Promise.all([
    prisma.region.findUnique({ where: { id: d.regionId } }),
    d.districtId ? prisma.district.findUnique({ where: { id: d.districtId } }) : null,
    prisma.specialization.findMany({ where: { id: { in: d.specializations } }, select: { id: true } }),
  ]);
  if (!region || (d.districtId && district?.regionId !== region.id) || specs.length === 0) {
    return { status: "error", error: "VALIDATION", fields: ["regionId"] };
  }

  let avatarUrl: string | undefined;
  const avatar = fd.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarUrl = publicUrl((await storeFile(avatar, "public/avatars", ALLOWED_IMAGE_TYPES)).key);
    } catch {
      return { status: "error", error: "FILE" };
    }
  }

  // Litsenziya raqami oʻzgarsa — qayta tekshiruv
  const licenseChanged = d.licenseNumber !== lawyer.licenseNumber;
  await prisma.$transaction([
    prisma.lawyerProfile.update({
      where: { id: lawyer.id },
      data: {
        fullName: d.fullName,
        bio: d.bio || null,
        education: d.education || null,
        workplace: d.workplace || null,
        experienceYears: d.experienceYears,
        licenseNumber: d.licenseNumber,
        consultationFee: d.consultationFee,
        regionId: region.id,
        districtId: district?.id ?? null,
        languages: d.languages,
        ...(avatarUrl && { avatarUrl }),
        ...(licenseChanged && {
          licenseVerified: false,
          ...(lawyer.status === "TASDIQLANGAN" || lawyer.status === "RAD" ? { status: "KUTILMOQDA" as const } : {}),
        }),
        specializations: { deleteMany: {}, create: specs.map((s) => ({ specializationId: s.id })) },
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { name: d.fullName } }),
  ]);
  revalidatePublic();
  return { status: "ok" };
}

// ---------- Hujjatlar ----------

export type DocState = { status: "idle" } | { status: "ok" } | { status: "error"; error: "FILE_SIZE" | "FILE_TYPE" | "VALIDATION" };

export async function uploadDocumentAction(_prev: DocState, fd: FormData): Promise<DocState> {
  const { lawyer } = await requireLawyer();
  const type = z.enum(["LITSENZIYA", "GUVOHNOMA", "DIPLOM", "BOSHQA"]).safeParse(fd.get("type"));
  const file = fd.get("file");
  if (!type.success || !(file instanceof File) || file.size === 0) return { status: "error", error: "VALIDATION" };
  const count = await prisma.document.count({ where: { lawyerId: lawyer.id } });
  if (count >= 20) return { status: "error", error: "VALIDATION" };
  try {
    const stored = await storeFile(file, `documents/${lawyer.id}`, ALLOWED_DOC_TYPES);
    await prisma.document.create({
      data: {
        lawyerId: lawyer.id,
        type: type.data,
        storageKey: stored.key,
        fileName: file.name.slice(0, 200),
        mimeType: stored.mime,
        size: stored.size,
      },
    });
  } catch (e) {
    return { status: "error", error: (e as Error).message === "FILE_SIZE" ? "FILE_SIZE" : "FILE_TYPE" };
  }
  revalidatePath("/[locale]/kabinet/hujjatlar", "page");
  return { status: "ok" };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const { lawyer } = await requireLawyer();
  const doc = await prisma.document.findFirst({ where: { id, lawyerId: lawyer.id } });
  if (!doc) return { ok: false, error: "NOT_FOUND" };
  await prisma.document.delete({ where: { id: doc.id } });
  await deleteFile(doc.storageKey);
  revalidatePath("/[locale]/kabinet/hujjatlar", "page");
  return { ok: true };
}

// ---------- Mijoz ----------

export async function cancelRequestAction(requestId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("FORBIDDEN");
  const res = await clientCancel(requestId, user.id);
  revalidatePath("/[locale]/kabinet", "layout");
  return res.ok ? { ok: true } : { ok: false, error: "BAD_TRANSITION" };
}
