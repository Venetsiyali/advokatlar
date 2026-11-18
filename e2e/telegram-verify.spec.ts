import { expect, test, type Page } from "@playwright/test";
import { prisma, testPhone } from "./helpers";

// Telefonni Telegram bot orqali tasdiqlash (SMS oʻrniga). Bot tomoni (kontakt, token) — npm run bot:simulate;
// bu yerda bot tasdiqlagan holat bazaga yoziladi va sayt oqimi tekshiriladi.

const display = (p: string) => p.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, "+998 $1 $2 $3 $4");

/** "Telegram orqali tasdiqlash" → token olinadi, t.me ochiladi (soxta), bot tasdiqlaydi */
async function verifyViaTelegram(page: Page, phone: string, telegramId: string) {
  await page.context().route("https://t.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "telegram" }));
  const link = page.getByRole("link", { name: "Telegram orqali tasdiqlash" });
  await expect(link).toHaveAttribute("href", /^https:\/\/t\.me\/\w+\?start=v_[\w-]{24,48}$/);
  const token = (await link.getAttribute("href"))!.match(/start=v_([\w-]+)/)![1];
  const popup = page.waitForEvent("popup");
  await link.click();
  await (await popup).close();
  await expect(page.getByText("Telegram'da raqamingizni yuboring")).toBeVisible();
  // Bot kontaktni qabul qildi
  await prisma.phoneVerification.create({
    data: { id: token, telegramId, phone, confirmedAt: new Date(), expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  await expect(page.getByTestId("tg-verified")).toContainText(display(phone));
  return token;
}

test("Telegram orqali tasdiqlab kirish: hisob botga bogʻlanadi, isbot bir martalik", async ({ page }) => {
  const phone = testPhone();
  const tgId = `e2e-${Date.now()}`;
  await page.goto("/kirish");
  const token = await verifyViaTelegram(page, phone, tgId);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/kabinet");

  const user = await prisma.user.findUniqueOrThrow({ where: { phone } });
  expect(user.telegramId).toBe(tgId);
  const v = await prisma.phoneVerification.findUniqueOrThrow({ where: { id: token } });
  expect(v.usedAt).not.toBeNull();

  // Ishlatilgan isbot bilan qayta kirib boʻlmaydi
  const res = await page.request.get(`/api/tg-verify?token=${token}`);
  expect((await res.json()).status).toBe("expired");
  await prisma.phoneVerification.delete({ where: { id: token } });
});

test("murojaat Telegram orqali tasdiqlangan raqam bilan yuboriladi", async ({ page }) => {
  const phone = testPhone();
  await page.goto("/murojaat");
  await page.getByLabel("Ismingiz").fill("E2E Telegram");
  await page.getByLabel("Viloyat").selectOption({ label: "Toshkent shahri" });
  await page.getByLabel("Muammo turi").selectOption({ label: "Oilaviy nizolar" });
  await page.getByLabel("Vaziyatni qisqacha tavsiflang").fill("E2E test: Telegram orqali tasdiqlangan murojaat.");
  const token = await verifyViaTelegram(page, phone, `e2e-r-${Date.now()}`);
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Murojaatni yuborish" }).click();
  const success = page.getByTestId("request-success");
  await expect(success).toBeVisible();
  const code = (await success.textContent())!.match(/M-[A-Z0-9]{6}/)![0];
  const req = await prisma.request.findUniqueOrThrow({ where: { code } });
  expect(req.phone).toBe(phone);
  await prisma.phoneVerification.delete({ where: { id: token } });
});

test("notoʻgʻri token rad etiladi", async ({ request }) => {
  expect((await request.get("/api/tg-verify?token=short")).status()).toBe(400);
  const res = await request.get(`/api/tg-verify?token=${"a".repeat(32)}`);
  expect((await res.json()).status).toBe("pending");
});
