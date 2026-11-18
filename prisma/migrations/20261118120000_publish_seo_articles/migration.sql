-- 20 ta SEO maqolani eʼlon qilish (admin koʻrib chiqib tasdiqladi, 2026-11-18).
-- Faqat hali eʼlon qilinmagan qoralamalarga tegadi; eʼlon sanalari roʻyxat tartibi tabiiy boʻlishi uchun soatma-soat suriladi.
UPDATE "Article" AS a
SET "published" = true,
    "publishedAt" = NOW() - (v.n * INTERVAL '1 hour'),
    "updatedAt" = NOW()
FROM (VALUES
  ('ajrashish-tartibi-ozbekistonda', 0),
  ('kak-razvestis-v-uzbekistane', 0),
  ('ajrashgandan-keyin-bola-kim-bilan-qoladi', 1),
  ('s-kem-ostanetsya-rebenok-posle-razvoda', 1),
  ('qarz-undirish-tilxat-bilan', 2),
  ('kak-vernut-dolg-po-raspiske', 2),
  ('firibgarlikka-uchrasangiz-nima-qilish-kerak', 3),
  ('chto-delat-esli-vas-obmanuli-moshenniki', 3),
  ('kreditni-tolay-olmasangiz-nima-qilish-kerak', 4),
  ('chto-delat-esli-nechem-platit-kredit', 4),
  ('ushlab-qolinganda-huquqlaringiz', 5),
  ('prava-pri-zaderzhanii', 5),
  ('uy-ijarasi-shartnomasi', 6),
  ('dogovor-arendy-kvartiry', 6),
  ('ish-haqi-berilmasa-qayerga-murojaat-qilish-kerak', 7),
  ('ne-vyplachivayut-zarplatu-kuda-obrashchatsya', 7),
  ('vasiyatnoma-qanday-tuziladi', 8),
  ('kak-sostavit-zaveshchanie', 8),
  ('advokat-xizmati-narxi', 9),
  ('skolko-stoit-advokat', 9)
) AS v(slug, n)
WHERE a."slug" = v.slug AND a."published" = false;
