// Lokal ishlab chiqish uchun Postgres (Docker bo'lmaganda). Ishga tushirish: npm run db:local
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dir = "./.pgdata";
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (!existsSync(dir)) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("advokat");
} catch {
  /* allaqachon mavjud */
}
console.log("Postgres ishga tushdi: postgresql://postgres:postgres@localhost:5433/advokat");
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
