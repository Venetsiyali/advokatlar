import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/translit";

async function setting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as T) ?? fallback;
}

/**
 * Advokat birinchi marta kirganda boʻsh profil (KUTILMOQDA) va — muddatgacha roʻyxatdan oʻtgan boʻlsa —
 * bepul sinov obunasini yaratadi. Takroran chaqirilsa hech narsa qilmaydi.
 */
export async function ensureLawyerProfile(userId: string) {
  const existing = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const base = slugify(user.name || "advokat") || "advokat";
  const slug = `${base}-${randomBytes(3).toString("hex")}`;

  const [trialDays, trialDeadline] = await Promise.all([
    setting<number>("trialDays", 30),
    setting<string>("trialDeadline", "2099-12-31"),
  ]);
  const now = new Date();
  const trialAllowed = now <= new Date(`${trialDeadline}T23:59:59`);

  return prisma.lawyerProfile.create({
    data: {
      userId,
      slug,
      fullName: user.name || "",
      status: "KUTILMOQDA",
      subscription: {
        create: {
          status: trialAllowed ? "SINOV" : "MUDDATI_OTGAN",
          startsAt: now,
          endsAt: trialAllowed ? new Date(now.getTime() + trialDays * 86400_000) : now,
        },
      },
    },
  });
}
