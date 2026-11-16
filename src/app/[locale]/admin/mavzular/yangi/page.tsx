import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { lname } from "@/lib/localized";
import { getSpecializations } from "@/server/lawyers";
import { PageTitle, Section } from "@/components/admin/ui";
import { TopicForm } from "../topic-form";

export default async function NewTopic({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, loc, specs] = await Promise.all([getTranslations("admin"), getLocale(), getSpecializations()]);
  return (
    <>
      <Link href="/admin/mavzular" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageTitle title={t("topic.new")} />
      <Section>
        <TopicForm
          specs={specs.map((s) => ({ id: s.id, name: lname(s, loc) }))}
          topic={{
            slug: "",
            title: "",
            titleUzCyrl: "",
            titleRu: "",
            summary: "",
            summaryRu: "",
            content: "",
            contentRu: "",
            icon: "",
            specializationId: "",
            sortOrder: 100,
            showOnHome: false,
            published: true,
          }}
        />
      </Section>
    </>
  );
}
