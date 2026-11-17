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
    const switcher = page.getByRole("navigation", { name: "Til" });
    // Uchala til ham sarlavhada doim koʻrinadi
    for (const name of ["Oʻzbekcha", "Ўзбекча", "Русский"]) await expect(switcher.getByRole("link", { name })).toBeVisible();
    await switcher.getByRole("link", { name: "Русский" }).click();
    await expect(page).toHaveURL(/\/ru\/narxlar$/);
    await expect(page.locator("h1")).toHaveText("Цены");
    await page.getByRole("link", { name: "Ўзбекча" }).click();
    await expect(page).toHaveURL(/\/uz-Cyrl\/narxlar$/);
    await expect(page.locator("h1")).toHaveText("Нархлар");
    await page.getByRole("link", { name: "Oʻzbekcha" }).click();
    await expect(page).toHaveURL(/\/narxlar$/);
    await expect(page.locator("h1")).toHaveText("Narxlar");
  });

  test("til almashganda katalog filtri saqlanadi", async ({ page }) => {
    await page.goto("/advokatlar/toshkent-shahri?tajriba=10");
    await page.getByRole("link", { name: "Русский" }).click();
    await expect(page).toHaveURL(/\/ru\/advokatlar\/toshkent-shahri\?tajriba=10$/);
    await expect(page.locator("h1")).toContainText("Ташкент");
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
    // Advokati yoʻq viloyat sitemap'da yoʻq (demo bazada Jizzaxda advokat yoʻq)
    expect(xml).not.toContain("/advokatlar/jizzax");
  });

  test("boʻsh viloyat sahifasi indekslanmaydi, toʻlasi indekslanadi", async ({ page }) => {
    await page.goto("/advokatlar/jizzax");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/advokatlar/toshkent-shahri");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
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
  // Til tugmalari telefonda ham sarlavhada (menyu ichida emas)
  for (const name of ["Oʻzbekcha", "Ўзбекча", "Русский"]) await expect(page.getByRole("link", { name })).toBeInViewport();
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

test("katalog filtri: statik sahifadan filtrli natijaga va orqaga", async ({ page }) => {
  await page.goto("/advokatlar");
  const count = async () => Number((await page.getByText(/\d+ ta advokat topildi/).textContent())!.match(/\d+/)![0]);
  const all = await count();
  // “Saralash” roʻyxatida ham “Tajriba boʻyicha” bor — aniq sarlavhali maydon olinadi
  const exp = page.locator("label", { has: page.getByText("Tajriba", { exact: true }) }).locator("select");
  // Filtr tanlanadi — manzilga parametr qoʻshiladi (middleware ichki dinamik marshrutga yoʻnaltiradi)
  await exp.selectOption("10");
  await expect(page).toHaveURL(/\/advokatlar\?tajriba=10$/);
  await expect.poll(count).toBeLessThan(all);
  await expect(exp).toHaveValue("10");
  // Tanlangan filtr sahifa yangilanganda ham saqlanadi
  await page.reload();
  await expect(exp).toHaveValue("10");
  // Tozalash — yana statik sahifa
  await page.getByRole("button", { name: "Tozalash" }).click();
  await expect(page).toHaveURL(/\/advokatlar$/);
  await expect.poll(count).toBe(all);
});

test("tor ekran (360 px): sarlavha sigʻadi @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  // Logotip, uchala til tugmasi va menyu tugmasi bir qatorda, ekrandan chiqmaydi
  await expect(page.getByRole("button", { name: "Menyu" })).toBeInViewport({ ratio: 1 });
  for (const name of ["Oʻzbekcha", "Ўзбекча", "Русский"]) await expect(page.getByRole("link", { name })).toBeInViewport({ ratio: 1 });
  // Menyu tugmasi ekran chetiga taqalmaydi (chekka boʻshliq saqlanadi) — 320 px da ham
  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 740 });
    const right = await page.getByRole("button", { name: "Menyu" }).evaluate((el) => window.innerWidth - el.getBoundingClientRect().right);
    expect(right, `chekka boʻshliq ${width}px da`).toBeGreaterThanOrEqual(8);
  }
  // “Kirish” telefonda sarlavhada emas, menyu ichida
  await expect(page.locator("header").getByRole("link", { name: "Kirish" })).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
