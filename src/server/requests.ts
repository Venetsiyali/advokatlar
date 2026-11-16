import "server-only";
import { prisma } from "@/lib/db";
import { dispatchRequest, generateRequestCode } from "./matching";

export type NewRequestInput = {
  clientId: string;
  name: string;
  phone: string; // normallashtirilgan +998…
  regionId: string;
  districtId?: string | null;
  specializationId: string;
  description: string;
  contactMethod: "CALL" | "TELEGRAM";
  source: "WEB" | "TELEGRAM";
  targetLawyerId?: string | null;
  attachmentKey?: string | null;
};

/** Maʼlumotnoma ID'larini tekshirish (sayt va bot uchun umumiy) */
export async function validateRefs(regionId: string, specializationId: string, districtId?: string | null) {
  const [region, spec, district] = await Promise.all([
    prisma.region.findUnique({ where: { id: regionId } }),
    prisma.specialization.findUnique({ where: { id: specializationId } }),
    districtId ? prisma.district.findUnique({ where: { id: districtId } }) : null,
  ]);
  if (!region || !spec || (districtId && district?.regionId !== region.id)) return null;
  return { region, spec, district };
}

/** Murojaatni saqlab, darhol birinchi guruh advokatlarga yuboradi */
export async function createRequestRecord(input: NewRequestInput) {
  const request = await prisma.request.create({
    data: {
      code: generateRequestCode(),
      clientId: input.clientId,
      name: input.name,
      phone: input.phone,
      phoneVerified: true,
      regionId: input.regionId,
      districtId: input.districtId || null,
      specializationId: input.specializationId,
      description: input.description,
      contactMethod: input.contactMethod,
      source: input.source,
      attachmentKey: input.attachmentKey ?? null,
      targetLawyerId: input.targetLawyerId ?? null,
    },
  });
  const res = await dispatchRequest(request.id);
  return { request, sent: res.sent };
}
