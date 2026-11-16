import { ADMIN_PHONE, TEST_PHONE_PREFIX, prisma, resetOtp } from "./helpers";

/** Testdan keyin: e2e mijozlari va ularning murojaatlarini oʻchirish, OTP limitlarini tozalash */
export default async function globalTeardown() {
  const requests = await prisma.request.findMany({
    where: { phone: { startsWith: TEST_PHONE_PREFIX } },
    select: { id: true },
  });
  const ids = requests.map((r) => r.id);
  await prisma.requestAssignment.deleteMany({ where: { requestId: { in: ids } } });
  await prisma.request.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { phone: { startsWith: TEST_PHONE_PREFIX } } });
  const lawyerPhones = (await prisma.user.findMany({ where: { role: "LAWYER" }, select: { phone: true } })).map((u) => u.phone!).filter(Boolean);
  await resetOtp([ADMIN_PHONE, ...lawyerPhones]);
  await prisma.$disconnect();
}
