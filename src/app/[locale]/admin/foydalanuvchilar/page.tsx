import type { Prisma, Role } from "@prisma/client";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { ADMIN_PAGE_SIZE, pageParam, strParam } from "@/server/admin";
import { setUserBlockedAction } from "@/server/admin-actions";
import { getCurrentUser } from "@/server/session";
import { ActionButton } from "@/components/forms/action-button";
import { EmptyRow, FilterTabs, PageTitle, Pager, Pill, SearchForm, Table, Td } from "@/components/admin/ui";

/** Har soʻrovda (sessiya yoki URL parametrlari) — build vaqtida generatsiya qilinmaydi */
export const dynamic = "force-dynamic";

const ROLES: Role[] = ["CLIENT", "LAWYER", "ADMIN"];
type SP = Record<string, string | string[] | undefined>;

export default async function AdminUsers({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = strParam(sp.q);
  const rolRaw = strParam(sp.rol);
  const rol = rolRaw === "blok" ? "blok" : (ROLES as string[]).includes(rolRaw) ? (rolRaw as Role) : "";
  const page = pageParam(sp.page);
  const digits = q.replace(/\D/g, "");

  const where: Prisma.UserWhereInput = {
    ...(rol === "blok" ? { isBlocked: true } : rol ? { role: rol } : {}),
    ...(q && {
      OR: [{ name: { contains: q, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])],
    }),
  };

  const [t, format, me, rows, total] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    getCurrentUser(),
    prisma.user.findMany({
      where,
      include: { lawyerProfile: { select: { id: true } }, _count: { select: { requests: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);
  const query = { q, rol };
  const errors = { SELF: t("user.self") };

  return (
    <>
      <PageTitle title={t("nav.users")} />
      <FilterTabs
        pathname="/admin/foydalanuvchilar"
        query={query}
        param="rol"
        value={rol}
        options={[{ value: "", label: t("all") }, ...ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) })), { value: "blok", label: t("user.blocked") }]}
      />
      <SearchForm q={q} placeholder={t("searchUsers")} hidden={{ rol }} />
      <Table head={[t("cols.name"), t("cols.phone"), t("cols.role"), t("cols.telegram"), t("nav.requests"), t("cols.created"), ""]}>
        {rows.length === 0 && <EmptyRow cols={7} text={t("empty")} />}
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-navy-50/40">
            <Td>
              {u.lawyerProfile ? (
                <Link href={`/admin/advokatlar/${u.lawyerProfile.id}`} className="font-semibold hover:underline">
                  {u.name || "—"}
                </Link>
              ) : (
                <span className="font-medium">{u.name || "—"}</span>
              )}
              {u.isBlocked && <span className="ml-2"><Pill value="BLOK">{t("user.blocked")}</Pill></span>}
            </Td>
            <Td className="whitespace-nowrap">{u.phone ? formatPhone(u.phone) : "—"}</Td>
            <Td>{t(`roles.${u.role}`)}</Td>
            <Td>{u.telegramId ? t("yes") : t("no")}</Td>
            <Td>{u._count.requests}</Td>
            <Td className="whitespace-nowrap text-slate-500">{format.dateTime(u.createdAt, { dateStyle: "short" })}</Td>
            <Td className="text-right">
              {u.id !== me?.id &&
                (u.isBlocked ? (
                  <ActionButton run={setUserBlockedAction.bind(null, u.id, false)} label={t("user.unblock")} size="sm" variant="outline" errors={errors} />
                ) : (
                  <ActionButton
                    run={setUserBlockedAction.bind(null, u.id, true)}
                    label={t("user.block")}
                    confirmText={t("user.confirmBlock")}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    errors={errors}
                  />
                ))}
            </Td>
          </tr>
        ))}
      </Table>
      <Pager pathname="/admin/foydalanuvchilar" query={query} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
