"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import { linkTelegram } from "@/lib/tg-verify";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ALLOWED_DOC_TYPES, storeFile } from "@/lib/storage";
import { createRequestRecord } from "./requests";
import { getCurrentUser } from "./session";

export type CreateRequestState =
  | { status: "idle" }
  | { status: "error"; error: "VALIDATION" | "OTP" | "RATE" | "FILE_SIZE" | "FILE_TYPE"; fields?: string[] }
  | { status: "ok"; code: string; sent: number };

const Schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().max(32),
  // 6 xonali kod yoki Telegram isboti ("tg:<token>")
  code: z.string().max(60).optional().default(""),
  regionId: z.string().min(1).max(40),
  districtId: z.string().max(40).optional().default(""),
  specializationId: z.string().min(1).max(40),
  description: z.string().trim().min(10).max(500),
  contactMethod: z.enum(["CALL", "TELEGRAM"]),
  consent: z.literal("on"),
  targetLawyer: z.string().max(120).optional().default(""),
});

export async function createRequestAction(_prev: CreateRequestState, fd: FormData): Promise<CreateRequestState> {
  const parsed = Schema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    return { status: "error", error: "VALIDATION", fields: parsed.error.issues.map((i) => String(i.path[0])) };
  }
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  if (!phone) return { status: "error", error: "VALIDATION", fields: ["phone"] };

  const ip = await clientIp();
  if (!rateLimit(`req:ip:${ip}`, 12, 3600_000).ok || !rateLimit(`req:phone:${phone}`, 6, 3600_000).ok) {
    return { status: "error", error: "RATE" };
  }

  // Maʼlumotnoma qiymatlari haqiqatda mavjudligini tekshirish
  const [region, spec, district, target] = await Promise.all([
    prisma.region.findUnique({ where: { id: d.regionId } }),
    prisma.specialization.findUnique({ where: { id: d.specializationId } }),
    d.districtId ? prisma.district.findUnique({ where: { id: d.districtId } }) : null,
    d.targetLawyer ? prisma.lawyerProfile.findUnique({ where: { slug: d.targetLawyer }, select: { id: true } }) : null,
  ]);
  if (!region || !spec || (d.districtId && district?.regionId !== region.id)) {
    return { status: "error", error: "VALIDATION", fields: ["regionId"] };
  }

  const rawFile = fd.get("attachment");
  if (rawFile instanceof File && rawFile.size > 5 * 1024 * 1024) return { status: "error", error: "FILE_SIZE" };

  // Telefon tasdigʻi: kirgan foydalanuvchining oʻz raqami boʻlsa — OTP shart emas
  const current = await getCurrentUser();
  const proof = current?.phone === phone ? {} : await verifyOtp(phone, d.code);
  if (!proof) return { status: "error", error: "OTP" };

  let attachmentKey: string | undefined;
  const file = fd.get("attachment");
  if (file instanceof File && file.size > 0) {
    try {
      attachmentKey = (await storeFile(file, "requests", ALLOWED_DOC_TYPES)).key;
    } catch (e) {
      return { status: "error", error: (e as Error).message === "FILE_SIZE" ? "FILE_SIZE" : "FILE_TYPE" };
    }
  }

  // Mijoz hisobi: telefon raqam boʻyicha topiladi yoki yaratiladi
  let client = current?.phone === phone ? current : await prisma.user.findUnique({ where: { phone } });
  if (client?.isBlocked) return { status: "error", error: "RATE" };
  client ??= await prisma.user.create({ data: { phone, name: d.name, role: "CLIENT" } });
  // Telegram orqali tasdiqlagan mijoz — murojaat holati haqidagi xabarlar botga keladi
  if (proof.telegramId && client.telegramId !== proof.telegramId) await linkTelegram(client.id, proof.telegramId);

  const { request, sent } = await createRequestRecord({
    clientId: client.id,
    name: d.name,
    phone,
    regionId: region.id,
    districtId: district?.id,
    specializationId: spec.id,
    description: d.description,
    contactMethod: d.contactMethod,
    source: "WEB",
    attachmentKey,
    targetLawyerId: target?.id,
  });
  return { status: "ok", code: request.code, sent };
}
