import { getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { lname } from "@/lib/localized";
import { getRegions, getSpecializations } from "@/server/lawyers";
import { getCurrentUser } from "@/server/session";
import { ProfileForm } from "./profile-form";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user?.lawyerProfile) redirect("/kabinet");
  const [loc, regions, specs, mySpecs] = await Promise.all([
    getLocale(),
    getRegions(),
    getSpecializations(),
    prisma.lawyerSpecialization.findMany({ where: { lawyerId: user.lawyerProfile.id } }),
  ]);
  const l = user.lawyerProfile;
  return (
    <Card className="p-5 sm:p-8">
      <ProfileForm
        regions={regions.map((r) => ({ id: r.id, name: lname(r, loc), districts: r.districts.map((d) => ({ id: d.id, name: lname(d, loc) })) }))}
        specs={specs.map((s) => ({ id: s.id, name: lname(s, loc) }))}
        initial={{
          fullName: l.fullName,
          bio: l.bio ?? "",
          education: l.education ?? "",
          workplace: l.workplace ?? "",
          experienceYears: l.experienceYears,
          licenseNumber: l.licenseNumber ?? "",
          consultationFee: l.consultationFee ? String(l.consultationFee) : "",
          regionId: l.regionId ?? "",
          districtId: l.districtId ?? "",
          languages: l.languages,
          specializations: mySpecs.map((s) => s.specializationId),
          avatarUrl: l.avatarUrl,
        }}
      />
    </Card>
  );
}
