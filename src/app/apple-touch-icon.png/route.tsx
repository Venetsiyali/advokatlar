import { appIcon } from "@/lib/app-icon";

export const dynamic = "force-static";

/** iPhone: Safari → Ulashish → “Bosh ekranga qoʻshish” */
export function GET() {
  return appIcon(180);
}
