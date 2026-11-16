import { getTranslations } from "next-intl/server";

/** Tarif afzalliklari: maʼlum kalitlar tarjima qilinadi, admin yozgan erkin matn oʻzgarishsiz koʻrsatiladi */
export async function planFeatures(raw: unknown): Promise<string[]> {
  const t = await getTranslations("planFeatures");
  const list = Array.isArray(raw) ? raw.map(String) : [];
  return list.map((f) => (t.has(f as "unlimitedRequests") ? t(f as "unlimitedRequests") : f));
}
