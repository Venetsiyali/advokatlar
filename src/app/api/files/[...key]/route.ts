import { NextResponse, type NextRequest } from "next/server";
import { readLocalFile, sniffMime, verifyLocalSignature } from "@/lib/storage";

// Lokal (mock) xotiradan fayl berish. "public/" — ochiq, qolganlari imzo talab qiladi.
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  const isPublic = key.startsWith("public/");
  if (!isPublic) {
    const exp = Number(req.nextUrl.searchParams.get("exp"));
    const sig = req.nextUrl.searchParams.get("sig") ?? "";
    if (!verifyLocalSignature(key, exp, sig)) return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const buf = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": sniffMime(buf) ?? "application/octet-stream",
        "Cache-Control": isPublic ? "public, max-age=86400" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
