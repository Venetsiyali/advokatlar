import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { INDEXNOW_ENDPOINT, articleUrls, inAllLocales, indexNowEnabled, indexNowPayload, lawyerUrls } from "@/lib/indexnow";

/**
 * IndexNow: oʻzgargan sahifalar haqida Bing, Yandex va boshqa qidiruv tizimlariga darhol xabar beradi
 * (sitemap'ni qayta oʻqishni kutmasdan). Javob qaytgandan keyin (after) yuboriladi — admin kutmaydi,
 * xato boʻlsa faqat logga yoziladi.
 */
function ping(resolve: () => Promise<string[]> | string[]) {
  if (!indexNowEnabled()) return;
  after(async () => {
    try {
      const payload = indexNowPayload(await resolve());
      if (payload.urlList.length === 0) return;
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      // 200 — qabul qilindi, 202 — kalit tekshirilmoqda
      if (res.status !== 200 && res.status !== 202) console.warn(`[indexnow] ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
    } catch (e) {
      console.warn("[indexnow]", e instanceof Error ? e.message : e);
    }
  });
}

/** Advokat profili (tasdiqlash, blok, profil yoki reyting oʻzgarishi) */
export function pingLawyer(lawyerId: string) {
  ping(async () => {
    const l = await prisma.lawyerProfile.findUnique({
      where: { id: lawyerId },
      select: { slug: true, region: { select: { slug: true } }, specializations: { select: { specialization: { select: { slug: true } } } } },
    });
    return l ? lawyerUrls({ slug: l.slug, region: l.region, specs: l.specializations.map((s) => s.specialization.slug) }) : [];
  });
}

export function pingArticle(slug: string, locale: "uz" | "uz_Cyrl" | "ru") {
  ping(() => articleUrls(slug, locale));
}

export function pingTopic(slug: string) {
  ping(() => [...inAllLocales(`/mavzu/${slug}`), ...inAllLocales("/mavzu")]);
}

export function pingPage(slug: string) {
  ping(() => inAllLocales(`/${slug}`));
}
