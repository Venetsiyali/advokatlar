/** Admin paneldan tahrirlanadigan maʼlumot sahifalari (URL = slug) */
export const STATIC_SLUGS = ["biz-haqimizda", "aloqa", "maxfiylik-siyosati", "ommaviy-oferta"] as const;
export type StaticSlug = (typeof STATIC_SLUGS)[number];

export function staticTitle(p: { titleUz: string; titleUzCyrl: string; titleRu: string }, locale: string) {
  return locale === "ru" ? p.titleRu : locale === "uz-Cyrl" ? p.titleUzCyrl : p.titleUz;
}
export function staticContent(p: { contentUz: string; contentUzCyrl: string; contentRu: string }, locale: string) {
  return locale === "ru" ? p.contentRu : locale === "uz-Cyrl" ? p.contentUzCyrl : p.contentUz;
}
