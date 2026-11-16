import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";

// Ijtimoiy tarmoq va Telegram'da havola ulashilganda koʻrinadigan umumiy rasm.
// Matn faqat lotincha — standart shriftda kirill harflari boʻlmasligi mumkin.
export const alt = site.brand;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  // Lotin yozuvidagi matn barcha tillar uchun (shrift cheklovi)
  const t = await getTranslations({ locale: "uz", namespace: "og" });
  const domain = site.url.replace(/^https?:\/\//, "");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1f36 0%, #102c4a 55%, #0f5d4a 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
            ⚖
          </div>
          <div style={{ fontSize: 56, fontWeight: 800 }}>{site.brand}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{t("title")}</div>
          <div style={{ fontSize: 32, color: "#b8c7da" }}>{t("subtitle")}</div>
        </div>
        <div style={{ fontSize: 28, color: "#86efac" }}>{domain}</div>
      </div>
    ),
    size,
  );
}
