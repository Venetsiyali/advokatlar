import { ARTICLES_RU } from "./articles-ru";
import { ARTICLES_UZ } from "./articles-uz";

export type SeoArticle = { slug: string; title: string; excerpt: string; content: string };

// Har bir maqola oxiriga qoʻshiladigan ogohlantirish (YMYL: yuridik maʼlumot — maslahat emas)
const DISCLAIMER = {
  uz: `<p><em>Ushbu maqola umumiy maʼlumot berish uchun tayyorlangan va yuridik maslahat oʻrnini bosmaydi. Qonunchilik oʻzgarib turadi — amaldagi tahririni <a href="https://lex.uz">lex.uz</a> saytida tekshiring yoki advokat bilan maslahatlashing.</em></p>`,
  ru: `<p><em>Статья носит общий информационный характер и не заменяет юридическую консультацию. Законодательство меняется — проверяйте действующую редакцию на <a href="https://lex.uz">lex.uz</a> или проконсультируйтесь с адвокатом.</em></p>`,
} as const;

const build = (list: SeoArticle[], locale: "uz" | "ru") =>
  list.map((a) => ({
    ...a,
    locale,
    // Seed HTML'i bir qatorga yigʻiladi (admin muharriri bilan bir xil koʻrinish)
    content: (a.content.trim() + DISCLAIMER[locale]).replace(/\n/g, ""),
  }));

/**
 * SEO maqolalar — QORALAMA sifatida yaratiladi (published: false).
 * Yuridik matn: eʼlon qilishdan oldin advokat koʻrib chiqadi va admin panelda (Maqolalar) “Eʼlon qilish”ni belgilaydi.
 */
export const SEO_ARTICLES = [...build(ARTICLES_UZ, "uz"), ...build(ARTICLES_RU, "ru")];
