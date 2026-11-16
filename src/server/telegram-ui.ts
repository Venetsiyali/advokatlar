import "server-only";
import { botT, dbName, type AppLocale } from "@/lib/bot-i18n";
import { formatPhone } from "@/lib/phone";
import { site } from "@/lib/site";
import type { InlineButton } from "@/lib/telegram";

// Sayt bildirishnomalari va bot uchun umumiy xabar/tugma shablonlari.

type Named = { nameUz: string; nameUzCyrl: string; nameRu: string };
export type RequestCardData = {
  id: string;
  code: string;
  name: string;
  phone: string;
  description: string;
  contactMethod: "CALL" | "TELEGRAM";
  status: string;
  region: Named;
  district: Named | null;
  specialization: Named;
};

const place = (r: RequestCardData, l: AppLocale) => [dbName(r.region, l), r.district && dbName(r.district, l)].filter(Boolean).join(", ");

/** Advokatga yangi murojaat (kontaktlarsiz) */
export function newRequestCard(r: RequestCardData, assignmentId: string, locale: AppLocale) {
  const t = botT(locale);
  const text = t("newRequest", { code: r.code, spec: dbName(r.specialization, locale), place: place(r, locale), description: r.description });
  const buttons: InlineButton[][] = [
    [
      { text: t("accept"), callback_data: `acc:${assignmentId}` },
      { text: t("reject"), callback_data: `rej:${assignmentId}` },
    ],
    [{ text: t("openCabinet"), url: `${site.url}/kabinet/murojaatlar` }],
  ];
  return { text, buttons };
}

/** Qabul qilgan advokatga — mijoz kontaktlari bilan */
export function acceptedCard(r: RequestCardData, locale: AppLocale) {
  const t = botT(locale);
  const text =
    t("accepted", {
      code: r.code,
      name: r.name,
      phone: formatPhone(r.phone),
      method: r.contactMethod === "TELEGRAM" ? t("methodTelegramShort") : t("methodCallShort"),
      spec: dbName(r.specialization, locale),
      place: place(r, locale),
      description: r.description,
    }) + `\n\n${t("statusChanged", { code: r.code, status: t.status(r.status) })}`;
  const buttons: InlineButton[][] = [];
  if (r.status === "QABUL_QILINDI") buttons.push([{ text: t("markProgress"), callback_data: `st:J:${r.id}` }]);
  if (r.status === "QABUL_QILINDI" || r.status === "JARAYONDA") buttons.push([{ text: t("markClosed"), callback_data: `st:Y:${r.id}` }]);
  return { text, buttons };
}
