import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import { ensureLawyerProfile } from "@/server/lawyer-onboarding";

class InvalidCode extends CredentialsSignin {
  code = "invalid_code";
}
class Blocked extends CredentialsSignin {
  code = "blocked";
}

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "CLIENT" | "LAWYER" | "ADMIN"; name?: string | null; phone?: string | null };
  }
  interface User {
    role?: "CLIENT" | "LAWYER" | "ADMIN";
    phone?: string | null;
  }
}

/** Telegram Login Widget maʼlumotlarini tekshirish (https://core.telegram.org/widgets/login#checking-authorization) */
export function verifyTelegramLogin(data: Record<string, string>): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !data.hash) return false;
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .filter((k) => rest[k] !== undefined && rest[k] !== "")
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");
  const fresh = Date.now() / 1000 - Number(rest.auth_date) < 86400;
  return expected === hash && fresh;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 86400 },
  pages: { signIn: "/kirish" },
  providers: [
    Credentials({
      id: "phone-otp",
      credentials: { phone: {}, code: {}, role: {}, name: {} },
      async authorize(c) {
        const phone = normalizePhone(String(c.phone ?? ""));
        const code = String(c.code ?? "");
        if (!phone || !(await verifyOtp(phone, code))) throw new InvalidCode();

        const wantsLawyer = c.role === "advokat";
        const name = String(c.name ?? "").trim().slice(0, 80) || null;
        let user = await prisma.user.findUnique({ where: { phone } });
        if (user?.isBlocked) throw new Blocked();
        if (!user) {
          user = await prisma.user.create({ data: { phone, name, role: wantsLawyer ? "LAWYER" : "CLIENT" } });
        } else if (wantsLawyer && user.role === "CLIENT") {
          user = await prisma.user.update({ where: { id: user.id }, data: { role: "LAWYER", name: user.name ?? name } });
        } else if (!user.name && name) {
          user = await prisma.user.update({ where: { id: user.id }, data: { name } });
        }
        if (user.role === "LAWYER") await ensureLawyerProfile(user.id);
        return { id: user.id, role: user.role, name: user.name, phone: user.phone };
      },
    }),
    Credentials({
      id: "telegram",
      credentials: { payload: {} },
      async authorize(c) {
        let data: Record<string, string>;
        try {
          data = JSON.parse(String(c.payload ?? "{}"));
        } catch {
          return null;
        }
        if (!verifyTelegramLogin(data)) throw new InvalidCode();
        const telegramId = String(data.id);
        const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || null;
        let user = await prisma.user.findUnique({ where: { telegramId } });
        // Administrator Telegram ID'si (ADMIN_TELEGRAM_ID yoki shaxsiy TELEGRAM_ADMIN_CHAT_ID) — admin hisobiga bogʻlanadi.
        // SMS shlyuzi ulanmagan boʻlsa ham admin panelga kirish imkonini beradi; imzo bot tokeni bilan tekshirilgan.
        const adminTg = process.env.ADMIN_TELEGRAM_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
        if (adminTg && /^\d+$/.test(adminTg) && adminTg === telegramId && user?.role !== "ADMIN") {
          const adminPhone = normalizePhone(process.env.ADMIN_PHONE ?? "");
          const byPhone = adminPhone ? await prisma.user.findUnique({ where: { phone: adminPhone } }) : null;
          const admin = byPhone?.role === "ADMIN" ? byPhone : await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
          if (admin) {
            const [, linked] = await prisma.$transaction([
              prisma.user.updateMany({ where: { telegramId, id: { not: admin.id } }, data: { telegramId: null } }),
              prisma.user.update({ where: { id: admin.id }, data: { telegramId } }),
            ]);
            user = linked;
          }
        }
        if (user?.isBlocked) throw new Blocked();
        user ??= await prisma.user.create({ data: { telegramId, name, role: "CLIENT" } });
        if (user.role === "LAWYER") await ensureLawyerProfile(user.id);
        return { id: user.id, role: user.role, name: user.name, phone: user.phone };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.phone = user.phone;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "CLIENT" | "LAWYER" | "ADMIN";
      session.user.phone = (token.phone as string | null) ?? null;
      return session;
    },
  },
});
