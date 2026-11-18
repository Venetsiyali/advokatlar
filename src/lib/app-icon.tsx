import { ImageResponse } from "next/og";

// PNG ikonkalar (PWA, iPhone “Bosh ekranga qoʻshish”) — public/icon.svg logotipi asosida build vaqtida yasaladi.
const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 3 6 8.5v10.2C6 27.6 12 34.6 20 37c8-2.4 14-9.4 14-18.3V8.5L20 3Z" fill="#0b1f36" stroke="#d6b25c" stroke-width="1.2"/><path d="M20 11v17M14.5 28h11M12 15h16" stroke="#e2c376" stroke-width="1.8" stroke-linecap="round"/><path d="M12 15l-3 6h6l-3-6ZM28 15l-3 6h6l-3-6Z" fill="none" stroke="#e2c376" stroke-width="1.6" stroke-linejoin="round"/><circle cx="20" cy="10.5" r="1.6" fill="#f6e3ae"/></svg>';

/** Toʻq koʻk fon ustida oltin qirrali qalqon va tarozi; maskable uchun xavfsiz hudud (~60%) */
export function appIcon(size: number) {
  const logo = Math.round(size * 0.6);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#102c4a" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;base64,${Buffer.from(LOGO).toString("base64")}`} width={logo} height={logo} alt="" />
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
