// Supabase Storage REST API (server kaliti bilan). Faqat serverda ishlatiladi: kalit brauzerga hech qachon yuborilmaydi.
// storage.ts (runtime) va scripts/vercel-build.ts (bucket'larni yaratish) dan foydalaniladi.

export type SupabaseStorage = { url: string; key: string; bucket: string; publicBucket: string };

const headers = (s: SupabaseStorage, extra: Record<string, string> = {}) => ({
  apikey: s.key,
  Authorization: `Bearer ${s.key}`,
  ...extra,
});

// Kalit ichidagi har bir boʻlak URL-ekranlanadi, "/" saqlanadi
const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

async function check(res: Response, what: string) {
  if (!res.ok) throw new Error(`Supabase Storage ${what}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function sbUpload(s: SupabaseStorage, bucket: string, key: string, body: Buffer, contentType: string) {
  await check(
    await fetch(`${s.url}/storage/v1/object/${bucket}/${encodeKey(key)}`, {
      method: "POST",
      headers: headers(s, { "Content-Type": contentType, "x-upsert": "false" }),
      body: new Uint8Array(body),
    }),
    "upload",
  );
}

export async function sbDelete(s: SupabaseStorage, bucket: string, key: string) {
  await check(
    await fetch(`${s.url}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: headers(s, { "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: [key] }),
    }),
    "delete",
  );
}

/** Yopiq fayl uchun vaqtinchalik havola */
export async function sbSignedUrl(s: SupabaseStorage, bucket: string, key: string, expiresIn: number) {
  const res = await check(
    await fetch(`${s.url}/storage/v1/object/sign/${bucket}/${encodeKey(key)}`, {
      method: "POST",
      headers: headers(s, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn }),
    }),
    "sign",
  );
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${s.url}/storage/v1${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
}

export const sbPublicUrl = (s: SupabaseStorage, bucket: string, key: string) => `${s.url}/storage/v1/object/public/${bucket}/${encodeKey(key)}`;

/** Bucket'lar boʻlmasa yaratish: hujjatlar — yopiq, avatar/muqova — ochiq (build vaqtida chaqiriladi) */
export async function sbEnsureBuckets(s: SupabaseStorage, maxBytes: number) {
  const wanted = [
    { id: s.bucket, public: false, allowed_mime_types: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
    { id: s.publicBucket, public: true, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] },
  ];
  const created: string[] = [];
  for (const b of wanted) {
    const exists = await fetch(`${s.url}/storage/v1/bucket/${b.id}`, { headers: headers(s) });
    if (exists.ok) continue;
    await check(
      await fetch(`${s.url}/storage/v1/bucket`, {
        method: "POST",
        headers: headers(s, { "Content-Type": "application/json" }),
        body: JSON.stringify({ id: b.id, name: b.id, public: b.public, file_size_limit: maxBytes, allowed_mime_types: b.allowed_mime_types }),
      }),
      `create bucket ${b.id}`,
    );
    created.push(b.id);
  }
  return created;
}
