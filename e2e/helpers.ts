import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/** E2E mijozlari shu prefiks bilan yaratiladi va testdan keyin oʻchiriladi */
export const TEST_PHONE_PREFIX = "+99899";
export const ADMIN_PHONE = process.env.E2E_ADMIN_PHONE ?? "+998900000000";

export function testPhone() {
  return `${TEST_PHONE_PREFIX}${String(Date.now()).slice(-7)}`;
}

/** +998901234567 → "901234567" (PhoneInput +998 ni oʻzi qoʻshadi) */
export const localDigits = (phone: string) => phone.replace(/^\+998/, "");

/** Telefon raqamga yuborilgan test kodni (OTP_DEV_ECHO=1) sahifadan oʻqib, kiritadi */
export async function fillOtp(page: Page, phone: string) {
  const phoneInput = page.getByPlaceholder("+998 90 123 45 67");
  await phoneInput.click();
  await phoneInput.pressSequentially(localDigits(phone));
  await page.getByRole("button", { name: "Kod olish" }).click();
  const hint = page.getByText(/Test rejimi: kod \d{6}/);
  await expect(hint).toBeVisible();
  const code = (await hint.textContent())!.match(/(\d{6})/)![1];
  await page.getByPlaceholder("••••••").fill(code);
}

/** SMS kod bilan kirish; callbackUrl ga yoʻnaltirilishini kutadi */
export async function login(page: Page, phone: string, callbackUrl = "/kabinet") {
  await page.goto(`/kirish?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await fillOtp(page, phone);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await page.waitForURL((u) => u.pathname === callbackUrl);
}

/** Test telefonlari uchun OTP limitlarini tozalash (60 s / soatiga 5 ta) */
export async function resetOtp(phones: string[]) {
  await prisma.otpCode.deleteMany({ where: { OR: [{ phone: { startsWith: TEST_PHONE_PREFIX } }, { phone: { in: phones } }] } });
}
