import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { alternates } from "@/lib/seo";
import { getRegions, getSpecializations } from "@/server/lawyers";
import { getCurrentUser } from "@/server/session";
import { formatPhone } from "@/lib/phone";
import { phoneChannels } from "@/lib/tg-verify";
import { RequestForm } from "./request-form";
import { ClientMessages } from "@/components/client-messages";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ advokat?: string; yonalish?: string; mavzu?: string; viloyat?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "request" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/murojaat") };
}

export default async function RequestPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [t, regions, specs, user] = await Promise.all([
    getTranslations("request"),
    getRegions(),
    getSpecializations(),
    getCurrentUser(),
  ]);

  // Oldindan tanlash: advokat profili, yoʻnalish yoki mavzu sahifasidan kelganda
  const target = sp.advokat
    ? await prisma.lawyerProfile.findFirst({
        where: { slug: sp.advokat, status: "TASDIQLANGAN" },
        include: { specializations: true },
      })
    : null;
  const topic = sp.mavzu ? await prisma.topicPage.findUnique({ where: { slug: sp.mavzu } }) : null;
  const specId =
    specs.find((s) => s.slug === sp.yonalish)?.id ?? topic?.specializationId ?? target?.specializations[0]?.specializationId ?? "";
  const regionId = regions.find((r) => r.slug === sp.viloyat)?.id ?? target?.regionId ?? "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-slate-600">{t("subtitle")}</p>
      {target && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{t("targetLawyer", { name: target.fullName })}</p>
      )}
      <Card className="mt-6 p-5 sm:p-8">
        <ClientMessages ns={["auth", "request"]}>
          <RequestForm
            regions={regions.map((r) => ({
              id: r.id,
              name: lname(r, locale),
              districts: r.districts.map((d) => ({ id: d.id, name: lname(d, locale) })),
            }))}
            specs={specs.map((s) => ({ id: s.id, name: lname(s, locale) }))}
            defaults={{
              regionId,
              specializationId: specId,
              name: user?.name ?? "",
              phone: user?.phone ? formatPhone(user.phone) : "",
              targetLawyer: target?.slug ?? "",
            }}
            phoneVerified={Boolean(user?.phone)}
            loggedIn={Boolean(user)}
            channels={phoneChannels()}
          />
        </ClientMessages>
      </Card>
    </div>
  );
}
