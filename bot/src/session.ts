import type { StorageAdapter } from "grammy";
import { prisma } from "@/lib/db";
import type { AppLocale } from "@/lib/bot-i18n";

export type Step = "name" | "phone" | "region" | "district" | "spec" | "description" | "contact" | "confirm";

export type Draft = {
  name?: string;
  phone?: string;
  regionId?: string;
  districtId?: string | null;
  specializationId?: string;
  description?: string;
  contactMethod?: "CALL" | "TELEGRAM";
};

export type SessionData = {
  locale?: AppLocale;
  step?: Step;
  draft: Draft;
  /** Dialog eskirishi uchun (24 soat) */
  startedAt?: number;
};

export const initialSession = (): SessionData => ({ draft: {} });

/** grammY session'ni PostgreSQL'da saqlash — bot qayta ishga tushsa ham dialog yoʻqolmaydi */
export class PrismaSessionStorage implements StorageAdapter<SessionData> {
  async read(key: string) {
    const row = await prisma.botSession.findUnique({ where: { key } });
    return (row?.value as SessionData | undefined) ?? undefined;
  }
  async write(key: string, value: SessionData) {
    await prisma.botSession.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }
  async delete(key: string) {
    await prisma.botSession.deleteMany({ where: { key } });
  }
}
