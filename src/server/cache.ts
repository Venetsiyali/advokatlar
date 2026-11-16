import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { reviveDates } from "@/lib/revive-dates";

// Ochiq sahifalar uchun maʼlumotlar keshi (Next.js Data Cache, Vercel'da barcha funksiyalar uchun umumiy).
// Har soʻrovda bazaga borish oʻrniga natija qisqa muddat saqlanadi; admin yoki advokat maʼlumotni
// oʻzgartirganda revalidatePublic() keshni darhol tozalaydi.

export const PUBLIC_TAG = "public";

/**
 * Funksiya natijasini keshlash. Kalit — nom + argumentlar (JSON).
 * revalidate — soniyalarda (maʼlumot shu vaqtdan eskiroq boʻlmaydi).
 */
export function cached<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>, revalidate: number) {
  const inner = unstable_cache(fn, [name], { revalidate, tags: [PUBLIC_TAG, `${PUBLIC_TAG}:${name}`] });
  return async (...args: A): Promise<R> => reviveDates(await inner(...args));
}

/** Ochiq sahifalarni (ISR) va maʼlumotlar keshini yangilash */
export function revalidatePublic() {
  revalidateTag(PUBLIC_TAG);
  revalidatePath("/[locale]", "layout");
}
