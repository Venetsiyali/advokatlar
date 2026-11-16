import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // api, _next, _vercel, OG rasm va nuqtali (statik) fayllardan tashqari barcha yoʻllar
  // (OG rasm /uz/opengraph-image manzilida — yoʻnaltirishsiz berilishi kerak)
  matcher: ["/((?!api|_next|_vercel|.*opengraph-image|.*\\..*).*)"],
};
