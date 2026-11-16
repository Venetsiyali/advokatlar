import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as s3Sign } from "@aws-sdk/s3-request-presigner";
import { supabaseStorageConfig } from "./supabase-env";
import { sbDelete, sbPublicUrl, sbSignedUrl, sbUpload } from "./supabase-storage";

// Uch rejim (ustuvorlik tartibida):
//   1) S3-mos xotira — S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY berilsa
//   2) Supabase Storage — Vercel ↔ Supabase integratsiyasi (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), kalitlar shart emas
//   3) lokal ./storage papkasi (ishlab chiqish / Docker)
// "public/" prefiksli kalitlar (avatarlar, muqovalar) ochiq, qolganlari (hujjatlar) faqat imzolangan URL orqali.
// S3_PUBLIC_BUCKET berilsa, ochiq fayllar alohida (public) bucket'da, hujjatlar esa yopiq S3_BUCKET da saqlanadi.

const s3Enabled = () => Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
const supa = () => (s3Enabled() ? null : supabaseStorageConfig(process.env));
const LOCAL_DIR = path.resolve(process.env.LOCAL_STORAGE_DIR || "./storage");

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
  });
  return client;
}

export const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Vercel soʻrov hajmi limiti 4.5 MB — shuning uchun 4 MB
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const bucketFor = (key: string) => (key.startsWith("public/") && process.env.S3_PUBLIC_BUCKET) || process.env.S3_BUCKET!;
const sbBucketFor = (key: string, s: NonNullable<ReturnType<typeof supa>>) => (key.startsWith("public/") ? s.publicBucket : s.bucket);

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Fayl tarkibini “magic bytes” boʻyicha tekshirish — brauzer yuborgan MIME'ga koʻr-koʻrona ishonmaslik uchun */
export function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export type StoredFile = { key: string; mime: string; size: number };

export async function storeFile(file: File, prefix: string, allowed: string[]): Promise<StoredFile> {
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error("FILE_SIZE");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !allowed.includes(mime)) throw new Error("FILE_TYPE");
  const key = `${prefix.replace(/\/$/, "")}/${randomUUID()}.${EXT[mime]}`;
  const sb = supa();
  if (s3Enabled()) {
    await s3().send(new PutObjectCommand({ Bucket: bucketFor(key), Key: key, Body: buf, ContentType: mime }));
  } else if (sb) {
    await sbUpload(sb, sbBucketFor(key, sb), key, buf, mime);
  } else {
    // Vercel'da disk faqat oʻqish uchun — S3 (Supabase Storage) sozlanmagan boʻlsa aniq xato
    if (process.env.VERCEL) {
      console.error("[storage] Fayl xotirasi sozlanmagan: Supabase integratsiyasi yoki S3_* kerak");
      throw new Error("STORAGE_NOT_CONFIGURED");
    }
    const full = safeLocalPath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buf);
  }
  return { key, mime, size: buf.length };
}

export async function deleteFile(key: string) {
  const sb = supa();
  if (s3Enabled()) await s3().send(new DeleteObjectCommand({ Bucket: bucketFor(key), Key: key }));
  else if (sb) await sbDelete(sb, sbBucketFor(key, sb), key).catch((e) => console.error("[storage]", e));
  else await unlink(safeLocalPath(key)).catch(() => {});
}

export async function readLocalFile(key: string) {
  return readFile(safeLocalPath(key));
}

function safeLocalPath(key: string) {
  const full = path.resolve(LOCAL_DIR, key);
  if (!full.startsWith(LOCAL_DIR + path.sep)) throw new Error("BAD_KEY");
  return full;
}

const sign = (key: string, exp: number) =>
  createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`${key}:${exp}`).digest("hex");

/** Yopiq fayl uchun vaqtinchalik havola (standart 10 daqiqa) */
export async function signedUrl(key: string, ttlSec = 600): Promise<string> {
  if (s3Enabled()) {
    return s3Sign(s3(), new GetObjectCommand({ Bucket: bucketFor(key), Key: key }), { expiresIn: ttlSec });
  }
  const sb = supa();
  if (sb) return sbSignedUrl(sb, sbBucketFor(key, sb), key, ttlSec);
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `/api/files/${key}?exp=${exp}&sig=${sign(key, exp)}`;
}

export function verifyLocalSignature(key: string, exp: number, sig: string) {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const a = Buffer.from(sign(key, exp), "hex");
  const b = Buffer.from(sig, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Ochiq fayllar (avatarlar) uchun doimiy URL */
export function publicUrl(key: string) {
  if (s3Enabled()) {
    const base = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${bucketFor(key)}`;
    return `${base.replace(/\/$/, "")}/${key}`;
  }
  const sb = supa();
  if (sb) return sbPublicUrl(sb, sbBucketFor(key, sb), key);
  return `/api/files/${key}`;
}
