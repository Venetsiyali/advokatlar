import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Analytics } from "@/components/site/analytics";
import { MobileCta } from "@/components/site/mobile-cta";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { alternates } from "@/lib/seo";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });

// viewportFit: cover — iPhone pastki chizigʻi ostida ham fon; panellar env(safe-area-inset-bottom) bilan surilgan
export const viewport: Viewport = { themeColor: "#102c4a", width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Ochiq sahifalar statik (ISR) generatsiya qilinishi uchun barcha tillar */
export function generateStaticParams() {
  // Docker build'da baza yoʻq: sahifalar birinchi soʻrovda generatsiya qilinib keshlanadi (ISR)
  if (process.env.BUILD_WITHOUT_DB === "1") return [];
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title", { brand: site.brand });
  return {
    metadataBase: new URL(site.url),
    title: { default: title, template: `%s | ${site.brand}` },
    description: t("description"),
    applicationName: site.brand,
    alternates: alternates(locale, "/"),
    openGraph: { type: "website", siteName: site.brand, title, description: t("description"), locale },
    icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
    // iPhone'da bosh ekrandan ochilganda
    appleWebApp: { capable: true, title: site.brand, statusBarStyle: "default" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const tc = await getTranslations("common");

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        {/* Tarjimalar brauzerga faqat kerakli sahifalarda beriladi (ClientMessages) */}
        <NextIntlClientProvider messages={{}}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <MobileCta label={tc("ctaRequest")} />
        </NextIntlClientProvider>
        <Suspense>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
