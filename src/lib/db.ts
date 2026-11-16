import { PrismaClient } from "@prisma/client";
import { applySupabaseEnv } from "./supabase-env";

// Vercel ↔ Supabase integratsiyasi oʻzgaruvchilari (POSTGRES_PRISMA_URL ...) → DATABASE_URL / DIRECT_URL
applySupabaseEnv(process.env);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
