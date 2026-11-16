import { expect, test } from "@playwright/test";
import { ADMIN_PHONE, fillOtp, login, prisma, testPhone } from "./helpers";

// Asosiy biznes oqimi: mijoz murojaati → advokatlarga yuborish → advokat qabul qiladi → kontaktlar ochiladi → admin koʻradi
test.describe.configure({ mode: "serial" });

const clientPhone = testPhone();
const clientDisplay = clientPhone.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, "+998 $1 $2 $3 $4");
let code = "";
let lawyerPhone = "";

test("mijoz SMS tasdiq bilan murojaat qoldiradi", async ({ page }) => {
  await page.goto("/murojaat");
  await page.getByLabel("Ismingiz").fill("E2E Mijoz");
  await page.getByLabel("Viloyat").selectOption({ label: "Toshkent shahri" });
  await page.getByLabel("Muammo turi").selectOption({ label: "Oilaviy nizolar" });
  await page.getByLabel("Vaziyatni qisqacha tavsiflang").fill("E2E test: ajrashish va aliment boʻyicha maslahat kerak.");
  await fillOtp(page, clientPhone);
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Murojaatni yuborish" }).click();

  const success = page.getByTestId("request-success");
  await expect(success).toBeVisible();
  code = (await success.textContent())!.match(/M-[A-Z0-9]{6}/)![0];

  const req = await prisma.request.findUniqueOrThrow({
    where: { code },
    include: { assignments: { include: { lawyer: { include: { user: true } } } } },
  });
  expect(req.status).toBe("YUBORILDI");
  expect(req.phoneVerified).toBe(true);
  expect(req.assignments.length).toBeGreaterThanOrEqual(1);
  lawyerPhone = req.assignments[0].lawyer.user.phone!;
});

test("advokat murojaatni koʻradi (kontaktlarsiz), qabul qiladi va telefon ochiladi", async ({ page }) => {
  test.skip(!code, "oldingi qadam bajarilmadi");
  await login(page, lawyerPhone, "/kabinet");
  await page.goto("/kabinet/murojaatlar");
  const card = page.getByTestId("incoming-request").filter({ hasText: code });
  await expect(card).toBeVisible();
  // Qabul qilinmaguncha mijoz raqami koʻrinmaydi
  await expect(page.getByText(clientDisplay)).toHaveCount(0);

  await card.getByRole("button", { name: "Qabul qilish" }).click();
  // Qabul qilingan murojaat “Yangi” roʻyxatidan chiqadi
  await expect(card).toHaveCount(0);
  await page.goto("/kabinet/murojaatlar?holat=qabul");
  await expect(page.getByText(code)).toBeVisible();
  await expect(page.getByText(clientDisplay).first()).toBeVisible();

  const req = await prisma.request.findUniqueOrThrow({ where: { code } });
  expect(req.status).toBe("QABUL_QILINDI");
});

test("admin murojaatni va yuborishlar tarixini koʻradi", async ({ page }) => {
  test.skip(!code, "oldingi qadam bajarilmadi");
  await login(page, ADMIN_PHONE, "/admin");
  await expect(page.getByRole("heading", { name: "Admin panel" })).toBeVisible();
  await page.goto(`/admin/murojaatlar?q=${code}`);
  await page.getByRole("link", { name: code }).click();
  await expect(page.getByText("Qabul qildi").first()).toBeVisible();
  await expect(page.getByText("E2E Mijoz")).toBeVisible();
});

test("oddiy foydalanuvchi admin panelga kira olmaydi", async ({ page }) => {
  test.skip(!code, "oldingi qadam bajarilmadi");
  // Mijoz murojaat paytida avtomatik roʻyxatdan oʻtgan; murojaatdagi SMS kodning 60 s kutish vaqtini tozalaymiz
  await prisma.otpCode.deleteMany({ where: { phone: clientPhone } });
  await login(page, clientPhone, "/kabinet");
  await expect(page.getByText(code)).toBeVisible();
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
