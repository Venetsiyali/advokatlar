import { setRequestLocale } from "next-intl/server";
import { StaticPageView, staticPageMetadata } from "@/components/site/static-page";

/** ISR: sahifa keshlanadi; admin tahriri revalidatePath orqali darhol yangilaydi */
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  return staticPageMetadata("maxfiylik-siyosati", (await params).locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StaticPageView slug="maxfiylik-siyosati" locale={locale} />;
}
