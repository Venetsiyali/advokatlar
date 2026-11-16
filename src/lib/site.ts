export const site = {
  brand: process.env.NEXT_PUBLIC_BRAND_NAME || "AdvokatKerak",
  // Vercel'da NEXT_PUBLIC_SITE_URL berilmasa — loyihaning production domeni
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, ""),
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+998 71 200 00 00",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@advokatkerak.uz",
  telegramBot: process.env.NEXT_PUBLIC_TELEGRAM_BOT || "advokatkerak_bot",
  telegramChannel: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL || "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || "",
  operator: process.env.NEXT_PUBLIC_OPERATOR_INFO || "“[Kompaniya nomi]” MChJ, STIR: [—]",
};
