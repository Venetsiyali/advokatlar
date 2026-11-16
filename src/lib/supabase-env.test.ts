import { afterEach, describe, expect, it, vi } from "vitest";
import { applySupabaseEnv, envBySuffix, limitPoolForBuild, sessionUrlFromPooled, supabaseStorageConfig } from "./supabase-env";
import { sbEnsureBuckets, sbPublicUrl, sbSignedUrl, sbUpload } from "./supabase-storage";

const POOLED = "postgres://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true";

describe("Vercel ↔ Supabase oʻzgaruvchilari", () => {
  it("integratsiya nomlaridan DATABASE_URL va DIRECT_URL (session pooler) yasaladi", () => {
    const env: Record<string, string | undefined> = {
      POSTGRES_PRISMA_URL: POOLED,
      POSTGRES_URL_NON_POOLING: "postgres://postgres:pw@db.abc.supabase.co:5432/postgres?sslmode=require",
    };
    const used = applySupabaseEnv(env);
    const db = new URL(env.DATABASE_URL!);
    expect(db.port).toBe("6543");
    expect(db.searchParams.get("pgbouncer")).toBe("true");
    expect(db.searchParams.get("connection_limit")).toBe("5");
    // db.<ref>.supabase.co (faqat IPv6) emas, pooler'ning 5432 porti
    const direct = new URL(env.DIRECT_URL!);
    expect(direct.hostname).toBe("aws-0-eu-central-1.pooler.supabase.com");
    expect(direct.port).toBe("5432");
    expect(direct.searchParams.has("pgbouncer")).toBe(false);
    expect(used).toEqual({ database: "POSTGRES_PRISMA_URL", direct: "POSTGRES_PRISMA_URL (5432)" });
  });

  it("NON_POOLING pooler boʻlsa — undan foydalaniladi", () => {
    const nonPooling = "postgres://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
    const env: Record<string, string | undefined> = { POSTGRES_PRISMA_URL: POOLED, POSTGRES_URL_NON_POOLING: nonPooling };
    applySupabaseEnv(env);
    expect(env.DIRECT_URL).toBe(nonPooling);
  });

  it("prefiksli nomlar ham topiladi", () => {
    const env: Record<string, string | undefined> = { STORAGE_POSTGRES_PRISMA_URL: POOLED };
    applySupabaseEnv(env);
    expect(env.DATABASE_URL).toContain("pooler.supabase.com:6543");
    expect(envBySuffix({ STORAGE_SUPABASE_URL: "u" }, "SUPABASE_URL")).toBe("u");
  });

  it("qoʻlda berilgan qiymatlar ustun", () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: "postgres://a", DIRECT_URL: "postgres://b", POSTGRES_PRISMA_URL: POOLED };
    expect(applySupabaseEnv(env)).toEqual({});
    expect(env.DATABASE_URL).toBe("postgres://a");
    expect(env.DIRECT_URL).toBe("postgres://b");
  });

  it("lokal: DIRECT_URL berilmasa DATABASE_URL olinadi", () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/advokat" };
    applySupabaseEnv(env);
    expect(env.DIRECT_URL).toBe(env.DATABASE_URL);
    expect(sessionUrlFromPooled(env.DATABASE_URL!)).toBeUndefined();
  });

  it("build vaqtida ulanishlar soni cheklanadi, ishlash vaqtida — yoʻq", () => {
    const build: Record<string, string | undefined> = { NEXT_PHASE: "phase-production-build", DATABASE_URL: POOLED + "&connection_limit=5" };
    limitPoolForBuild(build);
    expect(new URL(build.DATABASE_URL!).searchParams.get("connection_limit")).toBe("2");
    expect(new URL(build.DATABASE_URL!).searchParams.get("pgbouncer")).toBe("true");
    const runtime: Record<string, string | undefined> = { DATABASE_URL: POOLED + "&connection_limit=5" };
    limitPoolForBuild(runtime);
    expect(new URL(runtime.DATABASE_URL!).searchParams.get("connection_limit")).toBe("5");
  });

  it("Storage sozlamasi: service role yoki yangi secret kalit", () => {
    expect(supabaseStorageConfig({})).toBeNull();
    expect(supabaseStorageConfig({ SUPABASE_URL: "https://abc.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "k" })).toEqual({
      url: "https://abc.supabase.co",
      key: "k",
      bucket: "documents",
      publicBucket: "public",
    });
    expect(supabaseStorageConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x" })?.key).toBe("sb_secret_x");
  });
});

describe("Supabase Storage REST soʻrovlari", () => {
  const s = { url: "https://abc.supabase.co", key: "KEY", bucket: "documents", publicBucket: "public" };
  afterEach(() => vi.unstubAllGlobals());

  it("yuklash, imzolangan va ochiq URL", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/object/sign/")
        ? new Response(JSON.stringify({ signedURL: "/object/sign/documents/requests/a b.pdf?token=t" }))
        : new Response("{}"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sbUpload(s, "documents", "requests/a b.pdf", Buffer.from("%PDF"), "application/pdf");
    const [uploadUrl, uploadInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(uploadUrl).toBe("https://abc.supabase.co/storage/v1/object/documents/requests/a%20b.pdf");
    expect(uploadInit.method).toBe("POST");
    expect((uploadInit.headers as Record<string, string>).Authorization).toBe("Bearer KEY");

    const signed = await sbSignedUrl(s, "documents", "requests/a b.pdf", 600);
    expect(signed).toBe("https://abc.supabase.co/storage/v1/object/sign/documents/requests/a b.pdf?token=t");
    expect(sbPublicUrl(s, "public", "public/avatars/x.jpg")).toBe("https://abc.supabase.co/storage/v1/object/public/public/public/avatars/x.jpg");
  });

  it("xato javob istisno chiqaradi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
    await expect(sbUpload(s, "documents", "x.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow(/403/);
  });

  it("bucket'lar faqat yoʻq boʻlsa yaratiladi: hujjatlar yopiq, rasmlar ochiq", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (!init?.method) return new Response("{}", { status: url.endsWith("/documents") ? 200 : 404 });
      return new Response("{}");
    });
    vi.stubGlobal("fetch", fetchMock);
    const created = await sbEnsureBuckets(s, 4 * 1024 * 1024);
    expect(created).toEqual(["public"]);
    const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "POST")!;
    expect(JSON.parse((post[1] as RequestInit).body as string)).toMatchObject({ id: "public", public: true, file_size_limit: 4194304 });
  });
});
