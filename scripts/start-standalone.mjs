// Production artefaktini (output: "standalone") Docker'dagidek ishga tushirish: lokal tekshiruv va e2e uchun.
// Ishlatish: npm run start:prod   (PORT=3200 node scripts/start-standalone.mjs)
import { cpSync, existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";

const dir = ".next/standalone";
if (!existsSync(`${dir}/server.js`)) {
  console.error("Avval: npm run build");
  process.exit(1);
}
// Standalone papkasiga statik fayllar build tomonidan nusxalanmaydi (Dockerfile ham shunday qiladi)
for (const [from, to] of [
  [".next/static", `${dir}/.next/static`],
  ["public", `${dir}/public`],
]) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}
// Standalone server .env ni oʻqimaydi — mavjud boʻlsa yuklaymiz (muhit oʻzgaruvchilari ustun)
if (existsSync(".env")) process.loadEnvFile(".env");

const child = spawn(process.execPath, ["server.js"], {
  cwd: dir,
  stdio: "inherit",
  // HOSTNAME=0.0.0.0 — aniq host berilsa middleware rewrite tashqi proksi deb qabul qilinadi
  env: { ...process.env, NODE_ENV: "production", HOSTNAME: "0.0.0.0", PORT: process.env.PORT ?? "3000" },
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
