import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { MapPin, Paperclip, Phone, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { formatPhone } from "@/lib/phone";
import { signedUrl } from "@/lib/storage";
import { getCurrentUser } from "@/server/session";
import { acceptAction, rejectAction, setRequestStatusAction } from "@/server/cabinet-actions";
import { ActionButton } from "@/components/forms/action-button";
import { StatusBadge } from "../status-badge";
import { cn } from "@/lib/utils";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const TABS = ["yangi", "qabul", "jarayonda", "yopilgan"] as const;
type Tab = (typeof TABS)[number];

export default async function LawyerRequests({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ holat?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user?.lawyerProfile) redirect("/kabinet");
  const lawyerId = user.lawyerProfile.id;
  const tab: Tab = (TABS as readonly string[]).includes((await searchParams).holat ?? "") ? ((await searchParams).holat as Tab) : "yangi";

  const [t, format, loc] = await Promise.all([getTranslations("cabinet"), getFormatter(), getLocale()]);
  const include = { region: true, district: true, specialization: true } as const;

  const [newCount, newItems, assigned] = await Promise.all([
    prisma.requestAssignment.count({ where: { lawyerId, status: "YUBORILDI", request: { status: "YUBORILDI" } } }),
    tab === "yangi"
      ? prisma.requestAssignment.findMany({
          where: { lawyerId, status: "YUBORILDI", request: { status: "YUBORILDI" } },
          include: { request: { include } },
          orderBy: { sentAt: "desc" },
        })
      : [],
    tab !== "yangi"
      ? prisma.request.findMany({
          where: {
            assignedLawyerId: lawyerId,
            status: tab === "qabul" ? "QABUL_QILINDI" : tab === "jarayonda" ? "JARAYONDA" : { in: ["YOPILDI", "BEKOR_QILINDI"] },
          },
          include,
          orderBy: { acceptedAt: "desc" },
          take: 100,
        })
      : [],
  ]);

  const labels: Record<Tab, string> = {
    yangi: t("tabs.new"),
    qabul: t("tabs.accepted"),
    jarayonda: t("tabs.progress"),
    yopilgan: t("tabs.closed"),
  };
  const errs = { TAKEN: t("taken"), INACTIVE: t("inactive"), NOT_FOUND: t("taken") };

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist">
        {TABS.map((k) => (
          <Link
            key={k}
            role="tab"
            aria-selected={tab === k}
            href={{ pathname: "/kabinet/murojaatlar", query: { holat: k } }}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
              tab === k ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 text-navy-700 hover:bg-navy-50",
            )}
          >
            {labels[k]}
            {k === "yangi" && newCount > 0 && <span className="ml-2 rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-navy-950">{newCount}</span>}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === "yangi" && newItems.length === 0 && <Empty text={t("empty")} />}
        {newItems.map((a) => (
          <Card key={a.id} className="p-5" data-testid="incoming-request">
            <Head code={a.request.code} status={a.request.status} />
            <Meta
              spec={lname(a.request.specialization, loc)}
              place={[lname(a.request.region, loc), a.request.district && lname(a.request.district, loc)].filter(Boolean).join(", ")}
              time={format.dateTime(a.sentAt, { dateStyle: "medium", timeStyle: "short" })}
            />
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{a.request.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton run={acceptAction.bind(null, a.id)} label={t("accept")} errors={errs} />
              <ActionButton run={rejectAction.bind(null, a.id)} label={t("reject")} variant="outline" errors={errs} />
            </div>
          </Card>
        ))}

        {tab !== "yangi" && assigned.length === 0 && <Empty text={t("empty")} />}
        {await Promise.all(
          assigned.map(async (r) => (
            <Card key={r.id} className="p-5">
              <Head code={r.code} status={r.status} />
              <Meta
                spec={lname(r.specialization, loc)}
                place={[lname(r.region, loc), r.district && lname(r.district, loc)].filter(Boolean).join(", ")}
                time={format.dateTime(r.acceptedAt ?? r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              />
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{r.description}</p>
              {/* Mijoz kontaktlari faqat biriktirilgan advokatga koʻrinadi */}
              <dl className="mt-4 grid gap-2 rounded-xl bg-navy-50/60 p-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">{t("client")}</dt>
                  <dd className="font-semibold">{r.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t("clientPhone")}</dt>
                  <dd>
                    <a href={`tel:${r.phone}`} className="flex items-center gap-1 font-semibold text-brand-700">
                      <Phone className="size-3.5" /> {formatPhone(r.phone)}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t("contactVia")}</dt>
                  <dd className="flex items-center gap-1 font-semibold">
                    {r.contactMethod === "TELEGRAM" ? <Send className="size-3.5" /> : <Phone className="size-3.5" />}
                    {r.contactMethod === "TELEGRAM" ? "Telegram" : "Tel."}
                  </dd>
                </div>
              </dl>
              {r.attachmentKey && (
                <a
                  href={await signedUrl(r.attachmentKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:underline"
                >
                  <Paperclip className="size-4" /> {t("attachment")}
                </a>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status === "QABUL_QILINDI" && (
                  <ActionButton run={setRequestStatusAction.bind(null, r.id, "JARAYONDA")} label={t("markProgress")} variant="navy" />
                )}
                {(r.status === "QABUL_QILINDI" || r.status === "JARAYONDA") && (
                  <ActionButton run={setRequestStatusAction.bind(null, r.id, "YOPILDI")} label={t("markClosed")} variant="outline" />
                )}
              </div>
            </Card>
          )),
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="p-8 text-center text-slate-500">{text}</Card>;
}

function Head({ code, status }: { code: string; status: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-mono text-sm font-semibold">{code}</span>
      <StatusBadge status={status} />
    </div>
  );
}

function Meta({ spec, place, time }: { spec: string; place: string; time: string }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
      <span className="font-medium text-navy-800">{spec}</span>
      <span className="flex items-center gap-1">
        <MapPin className="size-3.5" /> {place}
      </span>
      <span>{time}</span>
    </p>
  );
}
