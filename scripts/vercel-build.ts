// Vercel build: muhit oʻzgaruvchilari → Prisma client → migratsiyalar → Supabase bucket'lari → ixtiyoriy seed → Next.js build.
// vercel.json → "buildCommand": "npm run vercel-build"
import { execSync } from "node:child_process";
import { applySupabaseEnv, supabaseStorageConfig } from "../src/lib/supabase-env";
import { sbEnsureBuckets } from "../src/lib/supabase-storage";

const run = (cmd: string) => execSync(cmd, { stdio: "inherit", env: process.env });

function fail(msg: string): never {
  // Diagnostika: faqat nomlar, qiymatlar hech qachon chiqarilmaydi
  const names = Object.keys(process.env)
    .filter((k) => /POSTGRES|SUPABASE|DATABASE|DIRECT_URL|AUTH_SECRET/.test(k))
    .sort();
  console.error(`\n✗ ${msg}`);
  console.error(`  Topilgan tegishli oʻzgaruvchilar: ${names.length ? names.join(", ") : "(yoʻq)"}`);
  console.error("  README → “Production: Vercel + Supabase”\n");
  process.exit(1);
}

async function main() {
  const used = applySupabaseEnv(process.env);
  if (used.database || used.direct) console.log(`Baza ulanishi: DATABASE_URL ← ${used.database ?? "berilgan"}, DIRECT_URL ← ${used.direct ?? "berilgan"}`);

  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    fail("Baza ulanishi topilmadi: Supabase integratsiyasini Production uchun ulang yoki DATABASE_URL va DIRECT_URL ni qoʻlda kiriting.");
  }
  if (!process.env.AUTH_SECRET) fail("AUTH_SECRET berilmagan.");

  // Vercel node_modules ni keshlaydi — postinstall har safar ishlamasligi mumkin
  run("npx prisma generate");

  // Migratsiyalar faqat production deploy'da (preview'lar production bazasini oʻzgartirmasin)
  const isProd = process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;
  if (isProd || process.env.MIGRATE_ON_PREVIEW === "1") {
    run("npx prisma migrate deploy");

    // Supabase Storage: bucket'lar boʻlmasa yaratiladi (S3_* qoʻlda berilgan boʻlsa — tegilmaydi)
    const sb = process.env.S3_BUCKET ? null : supabaseStorageConfig(process.env);
    if (sb) {
      try {
        const created = await sbEnsureBuckets(sb, 4 * 1024 * 1024);
        console.log(created.length ? `Supabase Storage: yaratildi — ${created.join(", ")}` : "Supabase Storage: bucket'lar mavjud");
      } catch (e) {
        // Fayl xotirasi xatosi saytni toʻxtatmasin — logda koʻrinadi
        console.warn("⚠ Supabase Storage bucket'larini tekshirib boʻlmadi:", (e as Error).message);
      }
    } else if (!process.env.S3_BUCKET) {
      console.warn("⚠ Fayl xotirasi sozlanmagan (Supabase integratsiyasi yoki S3_*): hujjat va rasm yuklash ishlamaydi.");
    }

    // Boshlangʻich maʼlumotlar (hududlar, yoʻnalishlar, tarif, sahifalar, admin). Takroriy ishga tushirish xavfsiz.
    if (process.env.SEED_ON_BUILD === "1") run("npx prisma db seed");
  } else {
    console.log("Preview deploy: migratsiyalar oʻtkazib yuborildi");
  }

  run("npx next build");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
