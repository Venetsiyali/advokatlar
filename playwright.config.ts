import { defineConfig, devices } from "@playwright/test";

// E2E testlar: production build (npm run build) + lokal baza (npm run db:local) kerak.
// Server — standalone artefakt (Docker bilan bir xil), scripts/start-standalone.mjs orqali.
// Har ishga tushirishda alohida server (3200-port) — OTP rate-limit xotirasi toza boʻlishi uchun.
// SMS mock rejimida boʻlishi kerak (ESKIZ_* boʻsh); test serveriga OTP_DEV_ECHO=1 beriladi — kod sahifada koʻrsatiladi.
const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Bitta umumiy baza va OTP limitlari — ketma-ket
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node scripts/start-standalone.mjs",
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { PORT: String(PORT), OTP_DEV_ECHO: "1", ENABLE_INTERNAL_CRON: "0" },
      },
});
