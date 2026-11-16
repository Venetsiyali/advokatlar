import { latinToCyrillic } from "./translit";
// DB dagi uch tilli nomlardan joriy tilga mosini tanlash
export type Named = { nameUz: string; nameUzCyrl: string; nameRu: string };

export function lname(item: Named | null | undefined, locale: string): string {
  if (!item) return "";
  if (locale === "ru") return item.nameRu;
  if (locale === "uz-Cyrl") return item.nameUzCyrl;
  return item.nameUz;
}

export function ltitle(
  item: { title: string; titleUzCyrl?: string | null; titleRu?: string | null },
  locale: string,
) {
  if (locale === "ru") return item.titleRu || item.title;
  if (locale === "uz-Cyrl") return item.titleUzCyrl || item.title;
  return item.title;
}

/** Mavzu sahifasi matni: rus — contentRu (boʻlmasa oʻzbekcha), kirill — lotinchadan transliteratsiya */
type TopicText = { summary?: string | null; summaryRu?: string | null; content: string; contentRu?: string | null };

export function topicSummary(tp: TopicText, locale: string) {
  if (locale === "ru") return tp.summaryRu || null;
  if (locale === "uz-Cyrl") return tp.summary ? latinToCyrillic(tp.summary) : null;
  return tp.summary || null;
}

export function topicContent(tp: TopicText, locale: string) {
  if (locale === "ru") return tp.contentRu || tp.content;
  if (locale === "uz-Cyrl") return latinToCyrillic(tp.content);
  return tp.content;
}

/** Maqola: lotin oʻzbekcha maqola kirill sahifada transliteratsiya qilinadi */
export function articleText<T extends { locale: string; title: string; excerpt: string | null; content: string }>(a: T, locale: string) {
  const cyr = locale === "uz-Cyrl" && a.locale === "uz";
  return {
    title: cyr ? latinToCyrillic(a.title) : a.title,
    excerpt: a.excerpt ? (cyr ? latinToCyrillic(a.excerpt) : a.excerpt) : null,
    content: cyr ? latinToCyrillic(a.content) : a.content,
  };
}
