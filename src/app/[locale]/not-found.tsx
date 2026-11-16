import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-navy-200">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound")}</h1>
      <p className="mt-2 text-slate-600">{t("notFoundText")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>
        {t("backHome")}
      </Link>
    </div>
  );
}
