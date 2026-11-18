import { Bot, Keyboard, session, type Context, type SessionFlavor } from "grammy";
import type { InlineKeyboardButton, UserFromGetMe } from "grammy/types";
import { prisma } from "@/lib/db";
import { botT, dbName, guessLocale, toDbLocale, fromDbLocale, type AppLocale, type BotT } from "@/lib/bot-i18n";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { acceptAssignment, lawyerSetStatus, rejectAssignment } from "@/server/matching";
import { createRequestRecord, validateRefs } from "@/server/requests";
import { confirmTelegramVerification, startTelegramVerification } from "@/lib/tg-verify";
import { acceptedCard, newRequestCard } from "@/server/telegram-ui";
import { PrismaSessionStorage, initialSession, type SessionData } from "./session";

export type BotContext = Context & SessionFlavor<SessionData>;

const LOCALES: AppLocale[] = ["uz", "uz-Cyrl", "ru"];
const LOCALE_LABEL: Record<AppLocale, string> = { uz: "🇺🇿 Oʻzbekcha", "uz-Cyrl": "🇺🇿 Ўзбекча", ru: "🇷🇺 Русский" };
const DIALOG_TTL = 24 * 3600_000;
const VERIFY_TTL = 15 * 60_000;

type InlineRows = InlineKeyboardButton[][];
const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const inline = (rows: InlineRows) => ({ reply_markup: { inline_keyboard: rows } });

/** Menyu tugmasi matnini barcha tillarda tanish (foydalanuvchi tilni oʻzgartirgan boʻlsa ham ishlashi uchun) */
const menuTexts = (key: string) => LOCALES.map((l) => botT(l).plain(key));

/** Telegram menyusidagi buyruqlar (webhook oʻrnatilganda yuboriladi) */
export const BOT_COMMANDS = [
  { command: "start", description: "Bosh menyu / Главное меню" },
  { command: "sorov", description: "Yangi murojaat / Новая заявка" },
  { command: "murojaatlarim", description: "Murojaatlarim / Мои заявки" },
  { command: "til", description: "Til / Язык" },
];

export function createBot(token: string, opts: { botInfo?: UserFromGetMe } = {}) {
  const bot = new Bot<BotContext>(token, { botInfo: opts.botInfo });

  bot.use(session({ initial: initialSession, storage: new PrismaSessionStorage() }));

  // Tilni aniqlash: sessiya → DB → Telegram tili
  const tr = async (ctx: BotContext): Promise<BotT> => {
    if (!ctx.session.locale && ctx.from) {
      const u = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { locale: true } });
      ctx.session.locale = u ? fromDbLocale(u.locale) : guessLocale(ctx.from.language_code);
    }
    return botT(ctx.session.locale ?? "uz");
  };

  const html = (ctx: BotContext, text: string, extra: Record<string, unknown> = {}) =>
    ctx.reply(text, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });

  const findUser = (ctx: BotContext) =>
    ctx.from ? prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, include: { lawyerProfile: true } }) : null;

  async function mainMenu(ctx: BotContext, text?: string) {
    const t = await tr(ctx);
    const user = await findUser(ctx);
    const kb = new Keyboard().text(t.plain("menuNewRequest")).text(t.plain("menuMyRequests")).row();
    if (user?.lawyerProfile) kb.text(t.plain("menuInbox")).text(t.plain("menuSubscription")).row();
    kb.text(t.plain("menuLanguage")).resized().persistent();
    const name = ctx.from?.first_name ?? "";
    await html(ctx, text ?? (user?.lawyerProfile ? t("welcomeLawyer", { name }) : t("welcome", { name })), { reply_markup: kb });
  }

  // ---------- Buyruqlar ----------

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim() ?? "";
    if (payload.startsWith("link_")) return linkLawyer(ctx, payload.slice(5));
    if (payload.startsWith("v_")) return startVerify(ctx, payload.slice(2));
    if (payload === "sorov") return startDialog(ctx);
    await mainMenu(ctx);
  });
  bot.command("help", async (ctx) => html(ctx, (await tr(ctx))("help")));
  bot.command("sorov", (ctx) => startDialog(ctx));
  bot.command("murojaatlarim", (ctx) => myRequests(ctx));
  bot.command("til", (ctx) => chooseLanguage(ctx));
  bot.command("bekor", (ctx) => cancelDialog(ctx));

  bot.hears(menuTexts("menuNewRequest"), (ctx) => startDialog(ctx));
  bot.hears(menuTexts("menuMyRequests"), (ctx) => myRequests(ctx));
  bot.hears(menuTexts("menuLanguage"), (ctx) => chooseLanguage(ctx));
  bot.hears(menuTexts("menuInbox"), (ctx) => lawyerInbox(ctx));
  bot.hears(menuTexts("menuSubscription"), (ctx) => lawyerSubscription(ctx));

  // ---------- Til ----------

  async function chooseLanguage(ctx: BotContext) {
    const t = await tr(ctx);
    await html(ctx, t("chooseLanguage"), inline([LOCALES.map((l) => ({ text: LOCALE_LABEL[l], callback_data: `lang:${l}` }))]));
  }

  bot.callbackQuery(/^lang:(uz|uz-Cyrl|ru)$/, async (ctx) => {
    const loc = ctx.match[1] as AppLocale;
    ctx.session.locale = loc;
    if (ctx.from) await prisma.user.updateMany({ where: { telegramId: String(ctx.from.id) }, data: { locale: toDbLocale(loc) } });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(LOCALE_LABEL[loc]).catch(() => {});
    await mainMenu(ctx, botT(loc)("languageSet"));
  });

  // ---------- Murojaat dialogi ----------

  async function startDialog(ctx: BotContext) {
    const t = await tr(ctx);
    const user = await findUser(ctx);
    if (user?.isBlocked) return html(ctx, t("blocked"));
    ctx.session.draft = {};
    ctx.session.startedAt = Date.now();
    // Bot orqali avval murojaat qilgan boʻlsa — ism va tasdiqlangan raqamni qayta soʻramaymiz
    if (user?.name && user.phone) {
      ctx.session.draft = { name: user.name, phone: user.phone };
      return askRegion(ctx);
    }
    ctx.session.step = "name";
    await html(ctx, t("askName"), inline([[{ text: t.plain("cancel"), callback_data: "x" }]]));
  }

  async function cancelDialog(ctx: BotContext) {
    ctx.session.step = undefined;
    ctx.session.draft = {};
    await mainMenu(ctx, (await tr(ctx))("cancelled"));
  }

  async function askPhone(ctx: BotContext) {
    const t = await tr(ctx);
    ctx.session.step = "phone";
    await html(ctx, t("askPhone"), {
      reply_markup: new Keyboard().requestContact(t.plain("phoneButton")).row().text(t.plain("cancel")).resized().oneTime(),
    });
  }

  async function askRegion(ctx: BotContext) {
    const t = await tr(ctx);
    ctx.session.step = "region";
    const regions = await prisma.region.findMany({ orderBy: { sortOrder: "asc" } });
    const rows = chunk(
      regions.map((r) => ({ text: dbName(r, t.locale), callback_data: `r:${r.id}` })),
      2,
    );
    rows.push([{ text: t.plain("cancel"), callback_data: "x" }]);
    await html(ctx, t("askRegion"), inline(rows));
  }

  async function askSpec(ctx: BotContext) {
    const t = await tr(ctx);
    ctx.session.step = "spec";
    const specs = await prisma.specialization.findMany({ orderBy: { sortOrder: "asc" } });
    const rows = chunk(
      specs.map((s) => ({ text: dbName(s, t.locale), callback_data: `s:${s.id}` })),
      2,
    );
    rows.push([{ text: t.plain("cancel"), callback_data: "x" }]);
    await html(ctx, t("askSpec"), inline(rows));
  }

  async function askConfirm(ctx: BotContext) {
    const t = await tr(ctx);
    ctx.session.step = "confirm";
    const d = ctx.session.draft;
    const refs = await validateRefs(d.regionId!, d.specializationId!, d.districtId);
    if (!refs) return startDialog(ctx);
    const place = [dbName(refs.region, t.locale), refs.district && dbName(refs.district, t.locale)].filter(Boolean).join(", ");
    await html(
      ctx,
      t("askConsent", {
        name: d.name!,
        phone: formatPhone(d.phone!),
        place,
        spec: dbName(refs.spec, t.locale),
        method: d.contactMethod === "TELEGRAM" ? t.plain("methodTelegram") : t.plain("methodCall"),
        description: d.description!,
        url: `${site.url}/maxfiylik-siyosati`,
      }),
      inline([[{ text: t.plain("agree"), callback_data: "ok" }], [{ text: t.plain("cancel"), callback_data: "x" }]]),
    );
  }

  /** Dialog bosqichi mos kelmasa yoki eskirgan boʻlsa — false */
  async function expectStep(ctx: BotContext, step: SessionData["step"]) {
    const fresh = ctx.session.startedAt && Date.now() - ctx.session.startedAt < DIALOG_TTL;
    if (ctx.session.step === step && fresh) return true;
    const t = await tr(ctx);
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: t.plain("sessionExpired"), show_alert: true });
    else await html(ctx, t("sessionExpired"));
    return false;
  }

  bot.callbackQuery("x", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => {});
    await cancelDialog(ctx);
  });

  // ---------- Saytdagi telefon tasdigʻi (SMS oʻrniga) ----------

  const verifyPending = (ctx: BotContext) =>
    Boolean(ctx.session.verifyToken && ctx.session.verifyAt && Date.now() - ctx.session.verifyAt < VERIFY_TTL);

  async function startVerify(ctx: BotContext, token: string) {
    const t = await tr(ctx);
    if (!ctx.from) return;
    const res = await startTelegramVerification(token, String(ctx.from.id));
    if (res === "invalid") return html(ctx, t("verifyInvalid"));
    if (res === "done") return html(ctx, t("verifyOk"));
    ctx.session.verifyToken = token;
    ctx.session.verifyAt = Date.now();
    await html(ctx, t("verifyAsk"), {
      reply_markup: new Keyboard().requestContact(t.plain("phoneButton")).resized().oneTime(),
    });
  }

  bot.on("message:contact", async (ctx) => {
    const t = await tr(ctx);
    if (verifyPending(ctx)) {
      // Faqat oʻz raqami — Telegram uni tasdiqlagan boʻladi
      if (ctx.message.contact.user_id !== ctx.from.id) return html(ctx, t("phoneNotOwn"));
      if (!normalizePhone(ctx.message.contact.phone_number)) return html(ctx, t("phoneInvalid"));
      const token = ctx.session.verifyToken!;
      ctx.session.verifyToken = undefined;
      ctx.session.verifyAt = undefined;
      const ok = await confirmTelegramVerification(token, String(ctx.from.id), ctx.message.contact.phone_number);
      return html(ctx, t(ok ? "verifyOk" : "verifyExpired"), { reply_markup: { remove_keyboard: true } });
    }
    if (!(await expectStep(ctx, "phone"))) return;
    // Faqat oʻz raqami — Telegram uni tasdiqlagan boʻladi (SMS OTP oʻrniga)
    if (ctx.message.contact.user_id !== ctx.from.id) return html(ctx, t("phoneNotOwn"));
    const phone = normalizePhone(ctx.message.contact.phone_number);
    if (!phone) return html(ctx, t("phoneInvalid"));
    ctx.session.draft.phone = phone;
    await html(ctx, t("phoneOk"), { reply_markup: { remove_keyboard: true } });
    await askRegion(ctx);
  });

  bot.callbackQuery(/^r:(\w+)$/, async (ctx) => {
    if (!(await expectStep(ctx, "region"))) return;
    const t = await tr(ctx);
    const region = await prisma.region.findUnique({ where: { id: ctx.match[1] }, include: { districts: { orderBy: { nameUz: "asc" } } } });
    if (!region) return ctx.answerCallbackQuery();
    ctx.session.draft.regionId = region.id;
    ctx.session.draft.districtId = null;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`📍 ${dbName(region, t.locale)}`).catch(() => {});
    ctx.session.step = "district";
    const rows = chunk(
      region.districts.map((d) => ({ text: dbName(d, t.locale), callback_data: `d:${d.id}` })),
      2,
    );
    rows.push([{ text: t.plain("skip"), callback_data: "d:-" }]);
    await html(ctx, t("askDistrict"), inline(rows));
  });

  bot.callbackQuery(/^d:(\w+|-)$/, async (ctx) => {
    if (!(await expectStep(ctx, "district"))) return;
    const t = await tr(ctx);
    const id = ctx.match[1];
    const district = id === "-" ? null : await prisma.district.findUnique({ where: { id } });
    if (district && district.regionId !== ctx.session.draft.regionId) return ctx.answerCallbackQuery();
    ctx.session.draft.districtId = district?.id ?? null;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(district ? `📍 ${dbName(district, t.locale)}` : t.plain("skip")).catch(() => {});
    await askSpec(ctx);
  });

  bot.callbackQuery(/^s:(\w+)$/, async (ctx) => {
    if (!(await expectStep(ctx, "spec"))) return;
    const t = await tr(ctx);
    const spec = await prisma.specialization.findUnique({ where: { id: ctx.match[1] } });
    if (!spec) return ctx.answerCallbackQuery();
    ctx.session.draft.specializationId = spec.id;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`📂 ${dbName(spec, t.locale)}`).catch(() => {});
    ctx.session.step = "description";
    await html(ctx, t("askDescription"));
  });

  bot.callbackQuery(/^m:(CALL|TELEGRAM)$/, async (ctx) => {
    if (!(await expectStep(ctx, "contact"))) return;
    ctx.session.draft.contactMethod = ctx.match[1] as "CALL" | "TELEGRAM";
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => {});
    await askConfirm(ctx);
  });

  bot.callbackQuery("ok", async (ctx) => {
    if (!(await expectStep(ctx, "confirm"))) return;
    const t = await tr(ctx);
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => {});
    const d = ctx.session.draft;
    const tgId = String(ctx.from.id);

    if (!rateLimit(`bot:req:${tgId}`, 5, 3600_000).ok) return html(ctx, t("rateLimited"));
    const refs = await validateRefs(d.regionId!, d.specializationId!, d.districtId);
    if (!refs || !d.name || !d.phone || !d.description || !d.contactMethod) return startDialog(ctx);

    const client = await resolveClient(tgId, d.phone, d.name, ctx.session.locale ?? "uz");
    if (!client) return html(ctx, t("blocked"));

    const { request, sent } = await createRequestRecord({
      clientId: client.id,
      name: d.name,
      phone: d.phone,
      regionId: refs.region.id,
      districtId: refs.district?.id,
      specializationId: refs.spec.id,
      description: d.description,
      contactMethod: d.contactMethod,
      source: "TELEGRAM",
    });
    ctx.session.step = undefined;
    ctx.session.draft = {};
    await mainMenu(ctx, sent > 0 ? t("created", { code: request.code }) : t("createdNoLawyer", { code: request.code }));
  });

  // Matnli javoblar (dialog bosqichlari)
  bot.on("message:text", async (ctx) => {
    const t = await tr(ctx);
    const text = ctx.message.text.trim();
    if (menuTexts("cancel").includes(text)) return cancelDialog(ctx);
    if (verifyPending(ctx)) return html(ctx, t("phoneUseButton"));
    const step = ctx.session.step;

    if (step === "name") {
      if (text.length < 2 || text.length > 80) return html(ctx, t("nameInvalid"));
      ctx.session.draft.name = text;
      return askPhone(ctx);
    }
    if (step === "phone") return html(ctx, t("phoneUseButton"));
    if (step === "description") {
      if (text.length < 10 || text.length > 500) return html(ctx, t("descriptionLength", { count: text.length }));
      ctx.session.draft.description = text;
      ctx.session.step = "contact";
      return html(
        ctx,
        t("askContact"),
        inline([
          [
            { text: t.plain("methodCall"), callback_data: "m:CALL" },
            { text: t.plain("methodTelegram"), callback_data: "m:TELEGRAM" },
          ],
        ]),
      );
    }
    if (step) return html(ctx, t("sessionExpired"));
    await html(ctx, t("unknown"));
  });

  // ---------- Mijoz: murojaatlarim ----------

  async function myRequests(ctx: BotContext) {
    const t = await tr(ctx);
    const user = await findUser(ctx);
    const requests = user
      ? await prisma.request.findMany({
          where: { OR: [{ clientId: user.id }, ...(user.phone ? [{ phone: user.phone }] : [])] },
          include: { specialization: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];
    if (requests.length === 0) return html(ctx, t("myRequestsEmpty"));
    const lines = requests.map((r) => t("requestLine", { code: r.code, spec: dbName(r.specialization, t.locale), status: t.status(r.status) }));
    await html(ctx, `${t("myRequestsTitle")}\n\n${lines.join("\n\n")}`);
  }

  // ---------- Advokat ----------

  async function linkLawyer(ctx: BotContext, code: string) {
    const t = await tr(ctx);
    if (!/^[A-F0-9]{8}$/.test(code) || !ctx.from) return html(ctx, t("linkInvalid"));
    const lawyer = await prisma.lawyerProfile.findUnique({ where: { telegramLinkCode: code } });
    if (!lawyer) return html(ctx, t("linkInvalid"));
    const tgId = String(ctx.from.id);
    await prisma.$transaction([
      // Bu Telegram hisobi boshqa foydalanuvchiga bogʻlangan boʻlsa — uzib qoʻyamiz
      prisma.user.updateMany({ where: { telegramId: tgId, id: { not: lawyer.userId } }, data: { telegramId: null } }),
      prisma.user.update({ where: { id: lawyer.userId }, data: { telegramId: tgId, locale: toDbLocale(t.locale) } }),
      prisma.lawyerProfile.update({ where: { id: lawyer.id }, data: { telegramLinkCode: null } }),
    ]);
    await mainMenu(ctx, t("linkOk"));
  }

  async function requireLawyer(ctx: BotContext) {
    const user = await findUser(ctx);
    if (!user?.lawyerProfile || user.role !== "LAWYER" || user.isBlocked) {
      const t = await tr(ctx);
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: t.plain("notLawyer"), show_alert: true });
      else await html(ctx, t("notLawyer"));
      return null;
    }
    return user.lawyerProfile;
  }

  async function lawyerInbox(ctx: BotContext) {
    const lawyer = await requireLawyer(ctx);
    if (!lawyer) return;
    const t = await tr(ctx);
    const items = await prisma.requestAssignment.findMany({
      where: { lawyerId: lawyer.id, status: "YUBORILDI", request: { status: "YUBORILDI" } },
      include: { request: { include: { region: true, district: true, specialization: true } } },
      orderBy: { sentAt: "desc" },
      take: 10,
    });
    if (items.length === 0) return html(ctx, t("inboxEmpty"));
    for (const a of items) {
      const card = newRequestCard(a.request, a.id, t.locale);
      const msg = await html(ctx, card.text, inline(card.buttons as InlineRows));
      await prisma.requestAssignment.update({ where: { id: a.id }, data: { tgMessageId: msg.message_id } });
    }
  }

  async function lawyerSubscription(ctx: BotContext) {
    const lawyer = await requireLawyer(ctx);
    if (!lawyer) return;
    const t = await tr(ctx);
    const sub = await prisma.subscription.findUnique({ where: { lawyerId: lawyer.id } });
    if (!sub) return html(ctx, t("inactive"));
    const date = new Intl.DateTimeFormat(t.locale === "ru" ? "ru-RU" : "uz-UZ").format(sub.endsAt);
    await html(ctx, t("subscriptionInfo", { status: t.status(sub.status), date }), inline([[{ text: "🌐", url: `${site.url}/kabinet/obuna` }]]));
  }

  const loadCard = (requestId: string) =>
    prisma.request.findUniqueOrThrow({ where: { id: requestId }, include: { region: true, district: true, specialization: true } });

  bot.callbackQuery(/^acc:(\w+)$/, async (ctx) => {
    const lawyer = await requireLawyer(ctx);
    if (!lawyer) return;
    const t = await tr(ctx);
    const res = await acceptAssignment(ctx.match[1], lawyer.id);
    if (res.ok) {
      await ctx.answerCallbackQuery();
      const card = acceptedCard(await loadCard(res.requestId), t.locale);
      return ctx.editMessageText(card.text, { parse_mode: "HTML", ...inline(card.buttons as InlineRows) });
    }
    if (res.reason === "INACTIVE") return ctx.answerCallbackQuery({ text: t.plain("inactive"), show_alert: true });
    await ctx.answerCallbackQuery();
    const a = await prisma.requestAssignment.findUnique({ where: { id: ctx.match[1] }, include: { request: { select: { code: true } } } });
    await ctx.editMessageText(a ? t("taken", { code: a.request.code }) : t("notAvailable"), { parse_mode: "HTML" }).catch(() => {});
  });

  bot.callbackQuery(/^rej:(\w+)$/, async (ctx) => {
    const lawyer = await requireLawyer(ctx);
    if (!lawyer) return;
    const t = await tr(ctx);
    const a = await prisma.requestAssignment.findFirst({ where: { id: ctx.match[1], lawyerId: lawyer.id }, include: { request: { select: { code: true } } } });
    const res = await rejectAssignment(ctx.match[1], lawyer.id);
    await ctx.answerCallbackQuery();
    await ctx
      .editMessageText(res.ok && a ? t("rejected", { code: a.request.code }) : t("notAvailable"), { parse_mode: "HTML" })
      .catch(() => {});
  });

  bot.callbackQuery(/^st:(J|Y):(\w+)$/, async (ctx) => {
    const lawyer = await requireLawyer(ctx);
    if (!lawyer) return;
    const t = await tr(ctx);
    const res = await lawyerSetStatus(ctx.match[2], lawyer.id, ctx.match[1] === "J" ? "JARAYONDA" : "YOPILDI");
    await ctx.answerCallbackQuery(res.ok ? undefined : { text: t.plain("notAvailable"), show_alert: true });
    if (!res.ok) return;
    const card = acceptedCard(await loadCard(ctx.match[2]), t.locale);
    await ctx.editMessageText(card.text, { parse_mode: "HTML", ...inline(card.buttons as InlineRows) }).catch(() => {});
  });

  // Nomaʼlum callback'lar (eski tugmalar)
  bot.on("callback_query:data", async (ctx) => ctx.answerCallbackQuery({ text: (await tr(ctx)).plain("sessionExpired") }));

  bot.catch((err) => console.error("[bot] xato:", err.error));
  return bot;
}

/**
 * Bot orqali murojaat qilgan mijozning hisobini topish/yaratish.
 * Telefon raqam Telegram kontakt orqali tasdiqlangan.
 */
async function resolveClient(telegramId: string, phone: string, name: string, locale: AppLocale) {
  const [byPhone, byTg] = await Promise.all([
    prisma.user.findUnique({ where: { phone } }),
    prisma.user.findUnique({ where: { telegramId } }),
  ]);
  if (byPhone?.isBlocked || byTg?.isBlocked) return null;
  if (byPhone) {
    if (!byPhone.telegramId && !byTg) {
      return prisma.user.update({ where: { id: byPhone.id }, data: { telegramId, name: byPhone.name ?? name } });
    }
    return byPhone;
  }
  if (byTg) {
    return byTg.phone ? byTg : prisma.user.update({ where: { id: byTg.id }, data: { phone, name: byTg.name ?? name } });
  }
  return prisma.user.create({ data: { phone, telegramId, name, role: "CLIENT", locale: toDbLocale(locale) } });
}
