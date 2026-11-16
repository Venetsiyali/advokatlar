import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";

/** PWA manifest: telefonda “Bosh ekranga qoʻshish” — ilova kabi alohida oynada ochiladi */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Manifest bitta — standart til (oʻzbekcha) matni
  const t = await getTranslations({ locale: "uz", namespace: "meta" });
  return {
    name: site.brand,
    short_name: site.brand,
    description: t("description"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#102c4a",
    lang: "uz",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
