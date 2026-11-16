import { describe, expect, it } from "vitest";
import { htmlToText, readingMinutes, sanitizeRichHtml } from "./sanitize";
import { latinToCyrillic, latinToCyrillicKeep } from "./translit";

describe("sanitizeRichHtml", () => {
  it("script, style va hodisa atributlarini olib tashlaydi", () => {
    const out = sanitizeRichHtml(`<p onclick="x()">Salom<script>alert(1)</script></p><style>p{}</style><img src=x onerror=alert(1)>`);
    expect(out).toBe("<p>Salom</p>");
  });

  it("javascript: havolalarini bloklaydi", () => {
    expect(sanitizeRichHtml(`<a href="javascript:alert(1)">x</a>`)).toBe("<a>x</a>");
  });

  it("tashqi havolaga xavfsiz rel va target qoʻshadi", () => {
    expect(sanitizeRichHtml(`<a href="https://lex.uz" rel="opener">Lex</a>`)).toBe(
      `<a href="https://lex.uz" target="_blank" rel="noopener noreferrer nofollow">Lex</a>`,
    );
  });

  it("ichki havola va formatlashni saqlaydi", () => {
    const html = `<h2>Sarlavha</h2><p><strong>Qalin</strong> <a href="/murojaat">murojaat</a></p><ul><li>Bir</li></ul>`;
    expect(sanitizeRichHtml(html)).toBe(html);
  });

  it("matnga aylantirish va oʻqish vaqti", () => {
    expect(htmlToText("<p>Bir</p><p>ikki  uch</p>")).toBe("Bir ikki uch");
    expect(readingMinutes("<p>soʻz</p>")).toBe(1);
  });
});

describe("transliteratsiya (HTML)", () => {
  it("teglar va HTML entity'larga tegmaydi", () => {
    expect(latinToCyrillic(`<p class="x">Salom &amp; rahmat</p>`)).toBe(`<p class="x">Салом &amp; раҳмат</p>`);
  });

  it("brend nomini lotincha qoldiradi", () => {
    expect(latinToCyrillicKeep("AdvokatKerak platformasi", ["AdvokatKerak"])).toBe("AdvokatKerak платформаси");
  });
});
