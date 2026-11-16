import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Joriy foydalanuvchini bazadan oladi (JWT dagi rolga koʻr-koʻrona ishonmaslik uchun:
 * bloklangan yoki roli oʻzgargan foydalanuvchi darhol taʼsirlanadi).
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, include: { lawyerProfile: true } });
  if (!user || user.isBlocked) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
