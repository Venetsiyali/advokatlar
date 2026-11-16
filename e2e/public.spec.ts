import { expect, test } from "@playwright/test";

test.describe("Ochiq sahifalar", () => {
  test("bosh sahifa: sarlavha, menyu, JSON-LD", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Advokatlar" }).first()).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)).toBeTruthy();
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute("href", /\/ru$/);
  });

  test("til almashtirish: rus va kirill", async ({ page }) => {
    await page.goto("/narxlar");
    await page.getByRole("combobox").first().selectOption("ru");
    await expect(page).toHaveURL(/\/ru\/narxlar$/);
    await expect(page.locator("h1")).toHaveText("Цены");
    await page.goto("/uz-Cyrl/narxlar");
    await expect(page.locator("h1")).toHaveText("Нархлар");
  });

  test("katalog → hudud → advokat profili", async ({ page }) => {
    await page.goto("/advokatlar");
    await page.goto("/advokatlar/toshkent-shahri");
    await expect(page.locator("h1")).toContainText("Toshkent");
    const profile = page.locator('a[href^="/advokat/"]').first();
    await expect(profile).toBeVisible();
    await profile.click();
    await expect(page).toHaveURL(/\/advokat\//);
    await expect(page.locator("h1")).toBeVisible();
    // Mijoz telefonlari yoki advokat shaxsiy raqami ochiq profilda koʻrinmaydi
    await expect(page.getByText(/\+998 93 100/)).toHaveCount(0);
  });

  test("mavzu, maqola, reyting, navbatchi, maʼlumot sahifalari", async ({ page }) => {
    for (const [path, heading] of [
      ["/mavzu/ajrashish", "Ajrashish"],
      ["/reyting", "Advokatlar reytingi"],
      ["/navbatchi-advokat", "Navbatchi advokat"],
      ["/maqolalar", "Maqolalar"],
      ["/maxfiylik-siyosati", "Maxfiylik siyosati"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("h1")).toContainText(heading);
    }
    await page.goto("/maqolalar");
    await page.locator('a[href^="/maqolalar/"]').first().click();
    await expect(page.locator(".prose-content")).toBeVisible();
  });

  test("404 sahifa", async ({ page }) => {
    const res = await page.goto("/mavzu/mavjud-emas");
    expect(res?.status()).toBe(404);
  });

  test("SEO fayllari: sitemap va robots", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const txt = await robots.text();
    expect(txt).toContain("Disallow: /admin");
    expect(txt).toContain("Sitemap:");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).toContain("/advokatlar/toshkent-shahri");
    expect(xml).toContain('hreflang="ru"');
    expect(xml).not.toContain("/admin");
  });

  test("himoyalangan sahifalar: kabinet va admin kirishni talab qiladi", async ({ page }) => {
    await page.goto("/kabinet");
    await expect(page).toHaveURL(/\/kirish\?callbackUrl=/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/kirish\?callbackUrl=/);
  });
});

test("mobil menyu @mobile", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menyu" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.getByRole("link", { name: "Narxlar" }).last().click();
  await expect(page).toHaveURL(/\/narxlar$/);
  // Gorizontal aylantirish yoʻq
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobil: pastki “murojaat” paneli @mobile", async ({ page }) => {
  await page.goto("/advokatlar");
  // Birinchi ekranda yashirin (asosiy tugma bilan takrorlanmasin; aria-hidden — ekran oʻqigichlar uchun ham)
  const hidden = page.getByRole("link", { name: "Bepul murojaat qoldirish", includeHidden: true });
  await expect(hidden).toHaveAttribute("tabindex", "-1");
  await expect(page.getByRole("link", { name: "Bepul murojaat qoldirish" })).toHaveCount(0);
  // Aylantirgandan keyin chiqadi
  await page.evaluate(() => window.scrollTo(0, 900));
  const cta = page.getByRole("link", { name: "Bepul murojaat qoldirish" });
  await expect(cta).toHaveAttribute("tabindex", "0");
  await expect(cta).toBeInViewport();
  await cta.click();
  await expect(page).toHaveURL(/\/murojaat$/);
  // Murojaat sahifasining oʻzida panel yoʻq
  await expect(page.getByRole("link", { name: "Bepul murojaat qoldirish" })).toHaveCount(0);
});
