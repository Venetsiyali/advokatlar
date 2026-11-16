// Vercel build: Prisma client → migratsiyalar (Supabase) → ixtiyoriy seed → Next.js build.
// vercel.json → "buildCommand": "npm run vercel-build"
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  console.error("\n✗ DATABASE_URL va DIRECT_URL Vercel → Settings → Environment Variables da berilishi shart (README: Vercel + Supabase).\n");
  process.exit(1);
}
if (!process.env.AUTH_SECRET) {
  console.error("\n✗ AUTH_SECRET berilmagan (openssl rand -base64 32).\n");
  process.exit(1);
}

// Vercel node_modules ni keshlaydi — postinstall har safar ishlamasligi mumkin
run("npx prisma generate");

// Migratsiyalar faqat production deploy'da (preview'lar production bazasini oʻzgartirmasin).
// Preview uchun alohida baza ishlatilsa: MIGRATE_ON_PREVIEW=1
const isProd = process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;
if (isProd || process.env.MIGRATE_ON_PREVIEW === "1") {
  run("npx prisma migrate deploy");
  // Boshlangʻich maʼlumotlar (hududlar, yoʻnalishlar, tarif, sahifalar, admin). Takroriy ishga tushirish xavfsiz.
  if (process.env.SEED_ON_BUILD === "1") run("npx prisma db seed");
} else {
  console.log("Preview deploy: migratsiyalar oʻtkazib yuborildi");
}

run("npx next build");
