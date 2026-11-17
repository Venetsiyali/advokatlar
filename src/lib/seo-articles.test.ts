import { describe, expect, it } from "vitest";
import { SEO_ARTICLES } from "../../prisma/data/articles";
import { ARTICLES, TOPICS } from "../../prisma/data/content";
import { SPECIALIZATIONS } from "../../prisma/data/regions";
import { htmlToText, sanitizeRichHtml } from "./sanitize";

// Seed qilinadigan SEO maqolalar: slug'lar takrorlanmasin, ichki havolalar mavjud sahifalarga olib borsin
const articleSlugs = new Map([...ARTICLES.map((a) => [a.slug, "uz"] as const), ...SEO_ARTICLES.map((a) => [a.slug, a.locale] as const)]);
const topics = new Set(TOPICS.map((t) => t.slug));
const specs = new Set(SPECIALIZATIONS.map((s) => s.slug));
const PAGES = new Set(["/murojaat", "/advokatlar", "/navbatchi-advokat", "/mavzu", "/maqolalar", "/reyting"]);

function linkOk(href: string, locale: "uz" | "ru"): boolean {
  if (href.startsWith("https://")) return true;
  const prefix = locale === "ru" ? "/ru" : "";
  if (!href.startsWith(prefix + "/") || (locale === "uz" && href.startsWith("/ru/"))) return false;
  const path = href.slice(prefix.length);
  if (PAGES.has(path)) return true;
  let m;
  if ((m = /^\/mavzu\/([\w-]+)$/.exec(path))) return topics.has(m[1]);
  if ((m = /^\/advokatlar\/yonalish\/([\w-]+)$/.exec(path))) return specs.has(m[1]);
  // Maqola faqat oʻz tilida ochiladi
  if ((m = /^\/maqolalar\/([\w-]+)$/.exec(path))) return articleSlugs.get(m[1]) === locale;
  return false;
}

describe("SEO maqolalar", () => {
  it("10 ta oʻzbekcha va 10 ta ruscha, slug'lar takrorlanmaydi", () => {
    expect(SEO_ARTICLES.filter((a) => a.locale === "uz")).toHaveLength(10);
    expect(SEO_ARTICLES.filter((a) => a.locale === "ru")).toHaveLength(10);
    expect(new Set([...ARTICLES, ...SEO_ARTICLES].map((a) => a.slug)).size).toBe(ARTICLES.length + SEO_ARTICLES.length);
  });

  it.each(SEO_ARTICLES.map((a) => [a.slug, a] as const))("%s: havolalar, uzunlik, sanitizatsiya", (_slug, a) => {
    const hrefs = [...a.content.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const h of hrefs) expect(linkOk(h, a.locale), h).toBe(true);
    // Google uchun yetarli hajm; sarlavha va tavsif qidiruv natijasiga sigʻadi
    expect(htmlToText(a.content).split(/\s+/).length).toBeGreaterThan(250);
    expect(a.title.length).toBeLessThanOrEqual(90);
    expect(a.excerpt.length).toBeLessThanOrEqual(170);
    expect(a.content).toContain("lex.uz");
    // Admin muharriri saqlaganda HTML oʻzgarmaydi (faqat tashqi havolaga rel/target qoʻshiladi)
    expect(sanitizeRichHtml(a.content).replace(/ target="_blank" rel="noopener noreferrer nofollow"/g, "")).toBe(a.content);
  });
});
