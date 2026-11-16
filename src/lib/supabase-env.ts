// Vercel ↔ Supabase integratsiyasi oʻzgaruvchilarini loyiha kutgan nomlarga moslash.
// Integratsiya POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY kabi
// nomlarni qoʻshadi (ba'zan prefiks bilan, masalan STORAGE_POSTGRES_PRISMA_URL). Qoʻlda berilgan
// DATABASE_URL / DIRECT_URL / S3_* doim ustun turadi. Faqat sof funksiyalar — build skripti va runtime uchun umumiy.

type Env = Record<string, string | undefined>;

/** NAME yoki istalgan prefiks bilan *_NAME (birinchi topilgani) */
export function envBySuffix(env: Env, name: string): string | undefined {
  if (env[name]) return env[name];
  const key = Object.keys(env).find((k) => k.endsWith(`_${name}`) && env[k]);
  return key ? env[key] : undefined;
}

function withParams(url: string, params: Record<string, string>) {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
}

/** Pooler URL (6543, transaction) → session rejimi (5432) — migratsiyalar uchun, IPv4 da ishlaydi */
export function sessionUrlFromPooled(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("pooler.supabase.com")) return undefined;
    u.port = "5432";
    u.searchParams.delete("pgbouncer");
    u.searchParams.delete("connection_limit");
    return u.toString();
  } catch {
    return undefined;
  }
}

/**
 * DATABASE_URL va DIRECT_URL ni integratsiya oʻzgaruvchilaridan toʻldiradi (env obyektini oʻzgartiradi).
 * Qaytaradi: qaysi manbadan olingani (log uchun, qiymatlarsiz).
 */
export function applySupabaseEnv(env: Env): { database?: string; direct?: string } {
  const used: { database?: string; direct?: string } = {};
  if (!env.DATABASE_URL) {
    const pooled = envBySuffix(env, "POSTGRES_PRISMA_URL") ?? envBySuffix(env, "POSTGRES_URL");
    if (pooled) {
      // Serverless: har funksiya nusxasi bitta ulanish; pgbouncer — prepared statement'larsiz
      env.DATABASE_URL = withParams(pooled, { pgbouncer: "true", connection_limit: "1" });
      used.database = "POSTGRES_PRISMA_URL";
    }
  }
  if (!env.DIRECT_URL) {
    const nonPooling = envBySuffix(env, "POSTGRES_URL_NON_POOLING");
    // db.<ref>.supabase.co faqat IPv6 — Vercel build undan foydalana olmaydi, shuning uchun pooler'ning session porti afzal
    const fromPooled = env.DATABASE_URL ? sessionUrlFromPooled(env.DATABASE_URL) : undefined;
    if (nonPooling && nonPooling.includes("pooler.supabase.com")) {
      env.DIRECT_URL = nonPooling;
      used.direct = "POSTGRES_URL_NON_POOLING";
    } else if (fromPooled) {
      env.DIRECT_URL = fromPooled;
      used.direct = "POSTGRES_PRISMA_URL (5432)";
    } else if (nonPooling) {
      env.DIRECT_URL = nonPooling;
      used.direct = "POSTGRES_URL_NON_POOLING";
    } else if (env.DATABASE_URL) {
      // Lokal / Docker: alohida toʻgʻridan-toʻgʻri ulanish yoʻq
      env.DIRECT_URL = env.DATABASE_URL;
      used.direct = "DATABASE_URL";
    }
  }
  return used;
}

/** Supabase Storage (REST API, server kaliti bilan) — S3 kalitlari kerak emas */
export function supabaseStorageConfig(env: Env) {
  const url = (envBySuffix(env, "SUPABASE_URL") ?? envBySuffix(env, "NEXT_PUBLIC_SUPABASE_URL"))?.replace(/\/$/, "");
  const key = envBySuffix(env, "SUPABASE_SERVICE_ROLE_KEY") ?? envBySuffix(env, "SUPABASE_SECRET_KEY");
  if (!url || !key) return null;
  return {
    url,
    key,
    bucket: env.SUPABASE_BUCKET || "documents",
    publicBucket: env.SUPABASE_PUBLIC_BUCKET || "public",
  };
}
