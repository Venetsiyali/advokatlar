import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEXNOW_KEY, articleUrls, indexNowEnabled, indexNowPayload, lawyerUrls } from "./indexnow";
import { site } from "./site";

describe("IndexNow", () => {
  it("kalit fayli public/ da va mazmuni kalitga teng", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(readFileSync(`public/${INDEXNOW_KEY}.txt`, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("maqola faqat oʻz tilidagi manzillar bilan yuboriladi", () => {
    expect(articleUrls("kak-razvestis", "ru")).toEqual([`${site.url}/ru/maqolalar/kak-razvestis`, `${site.url}/ru/maqolalar`]);
    expect(articleUrls("ajrashish", "uz")).toEqual([
      `${site.url}/maqolalar/ajrashish`,
      `${site.url}/maqolalar`,
      `${site.url}/uz-Cyrl/maqolalar/ajrashish`,
      `${site.url}/uz-Cyrl/maqolalar`,
    ]);
  });

  it("advokat: profil, katalog, viloyat va yoʻnalishlar — uchala tilda", () => {
    const urls = lawyerUrls({ slug: "ali-valiyev", region: { slug: "jizzax" }, specs: ["oilaviy", "meros"] });
    expect(urls).toHaveLength(5 * 3);
    expect(urls).toContain(`${site.url}/ru/advokat/ali-valiyev`);
    expect(urls).toContain(`${site.url}/uz-Cyrl/advokatlar/yonalish/meros`);
    expect(urls).toContain(`${site.url}/advokatlar/jizzax`);
  });

  it("soʻrov tanasi: takrorlar va begona domenlar olib tashlanadi", () => {
    const p = indexNowPayload([`${site.url}/a`, `${site.url}/a`, "https://boshqa.uz/x"]);
    expect(p.urlList).toEqual([`${site.url}/a`]);
    expect(p.keyLocation).toBe(`${site.url}/${INDEXNOW_KEY}.txt`);
    expect(p.host).toBe(new URL(site.url).host);
  });

  it("faqat production'da va haqiqiy domenda yoqiladi", () => {
    expect(indexNowEnabled({})).toBe(false);
    expect(indexNowEnabled({ VERCEL_ENV: "preview" })).toBe(false);
    // Testda sayt manzili localhost — majburan yoqilganda ham yubormaydi
    expect(indexNowEnabled({ VERCEL_ENV: "production" })).toBe(site.url.startsWith("https://") && !site.url.includes("localhost"));
    expect(indexNowEnabled({ VERCEL_ENV: "production", INDEXNOW_DISABLED: "1" })).toBe(false);
  });
});
