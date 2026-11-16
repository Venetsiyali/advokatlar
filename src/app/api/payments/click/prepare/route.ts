import { NextResponse } from "next/server";
import { handleClick } from "@/server/payments/click";

export const dynamic = "force-dynamic";

/** Click SHOP API: prepare (action=0) */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const fields = form ? Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) : {};
  return NextResponse.json(await handleClick(fields, "0"));
}
