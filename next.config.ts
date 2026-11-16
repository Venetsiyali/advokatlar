import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Docker uchun standalone; Vercel oʻz formatidan foydalanadi
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  experimental: {
    // Vercel funksiyalari soʻrov hajmini 4.5 MB bilan cheklaydi — fayl limiti 4 MB
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default withNextIntl(nextConfig);
