import { ADMIN_PHONE, prisma, resetOtp } from "./helpers";

/** Testdan oldin: baza mavjudligi va demo maʼlumotlar (seed: SEED_DEMO=1) borligini tekshirish */
export default async function globalSetup() {
  const [admin, lawyers] = await Promise.all([
    prisma.user.findUnique({ where: { phone: ADMIN_PHONE } }),
    prisma.lawyerProfile.count({ where: { status: "TASDIQLANGAN" } }),
  ]);
  if (!admin || admin.role !== "ADMIN" || lawyers < 2) {
    throw new Error("E2E uchun demo maʼlumotlar kerak: npm run db:seed (SEED_DEMO=1, admin " + ADMIN_PHONE + ")");
  }
  const lawyerPhones = (await prisma.user.findMany({ where: { role: "LAWYER" }, select: { phone: true } })).map((u) => u.phone!).filter(Boolean);
  await resetOtp([ADMIN_PHONE, ...lawyerPhones]);
  await prisma.$disconnect();
}
