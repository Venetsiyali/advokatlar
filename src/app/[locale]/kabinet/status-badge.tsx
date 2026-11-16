import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  YANGI: "bg-navy-50 text-navy-700",
  YUBORILDI: "bg-sky-50 text-sky-700",
  QABUL_QILINDI: "bg-brand-50 text-brand-700",
  JARAYONDA: "bg-amber-50 text-amber-700",
  YOPILDI: "bg-slate-100 text-slate-700",
  BEKOR_QILINDI: "bg-red-50 text-red-700",
};

export async function StatusBadge({ status }: { status: string }) {
  const t = await getTranslations("status");
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COLORS[status] ?? "bg-navy-50 text-navy-700")}>
      {t.has(status) ? t(status as "YANGI") : status}
    </span>
  );
}
