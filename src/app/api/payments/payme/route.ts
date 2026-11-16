import { NextResponse } from "next/server";
import { handlePayme } from "@/server/payments/payme";

export const dynamic = "force-dynamic";

/** Payme Merchant API endpoint. Kabinetda koʻrsatiladigan manzil: {SITE_URL}/api/payments/payme */
export async function POST(req: Request) {
  const body = await req.text();
  const res = await handlePayme(body, req.headers.get("authorization"));
  // Payme spetsifikatsiyasi: xatolar ham HTTP 200 bilan qaytariladi
  return NextResponse.json(res);
}
