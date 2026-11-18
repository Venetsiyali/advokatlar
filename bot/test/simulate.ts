// Botni Telegram'siz sinash: API chaqiruvlari ushlab olinadi, update'lar qoʻlda yuboriladi.
// Lokal bazada ishlaydi (test maʼlumotlari yaratadi). Ishga tushirish: npm run bot:simulate
import assert from "node:assert/strict";
import type { Update } from "grammy/types";
import { prisma } from "@/lib/db";
import { createBot } from "../src/bot";
import { processSubscriptions } from "@/server/subscriptions";

type Call = { method: string; payload: Record<string, unknown> };
const calls: Call[] = [];
let msgId = 1000;
let updateId = 1;

async function main() {
  delete process.env.TELEGRAM_BOT_TOKEN; // sayt bildirishnomalari mock rejimda qolsin
  const bot = createBot("TEST:TOKEN", {
    botInfo: {
      id: 1,
      is_bot: true,
      first_name: "TestBot",
      username: "test_bot",
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    } as never,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    const result = method === "sendMessage" ? { message_id: ++msgId, date: 0, chat: { id: 0, type: "private" } } : true;
    return { ok: true, result } as never;
  });

  const user = (id: number, name: string) => ({ id, is_bot: false, first_name: name, language_code: "uz" });
  const chat = (id: number, name: string) => ({ id, type: "private" as const, first_name: name });

  const send = async (uid: number, text: string) => {
    calls.length = 0;
    const isCmd = text.startsWith("/");
    await bot.handleUpdate({
      update_id: updateId++,
      message: {
        message_id: ++msgId,
        date: Math.floor(Date.now() / 1000),
        chat: chat(uid, "U"),
        from: user(uid, "U"),
        text,
        ...(isCmd && { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] }),
      },
    } as Update);
    return [...calls];
  };
  const contact = async (uid: number, phone: string, ownerId = uid) => {
    calls.length = 0;
    await bot.handleUpdate({
      update_id: updateId++,
      message: {
        message_id: ++msgId,
        date: Math.floor(Date.now() / 1000),
        chat: chat(uid, "U"),
        from: user(uid, "U"),
        contact: { phone_number: phone, first_name: "U", user_id: ownerId },
      },
    } as Update);
    return [...calls];
  };
  const press = async (uid: number, data: string) => {
    calls.length = 0;
    await bot.handleUpdate({
      update_id: updateId++,
      callback_query: {
        id: String(updateId),
        from: user(uid, "U"),
        chat_instance: "x",
        data,
        message: { message_id: ++msgId, date: 0, chat: chat(uid, "U"), text: "…" },
      },
    } as Update);
    return [...calls];
  };
  const texts = (cs: Call[]) => cs.map((c) => String(c.payload.text ?? "")).join("\n---\n");

  // Tozalash: oldingi simulyatsiya qoldiqlari
  const CLIENT_TG = 700001;
  const LAWYER_TG = 700002;
  const LAWYER2_TG = 700003;
  const CLIENT_PHONE = "+998977770011";
  await prisma.botSession.deleteMany({ where: { key: { in: [CLIENT_TG, LAWYER_TG, LAWYER2_TG].map(String) } } });
  await prisma.user.updateMany({ where: { telegramId: { in: [CLIENT_TG, LAWYER_TG, LAWYER2_TG].map(String) } }, data: { telegramId: null } });
  await prisma.user.deleteMany({ where: { phone: CLIENT_PHONE } });

  // ---- 1. Mijoz: murojaat dialogi ----
  let out = await send(CLIENT_TG, "/start");
  assert.match(texts(out), /Assalomu alaykum/);
  console.log("✓ /start — xush kelibsiz");

  out = await send(CLIENT_TG, "/sorov");
  assert.match(texts(out), /Ismingizni yozing/);
  out = await send(CLIENT_TG, "B");
  assert.match(texts(out), /2 dan 80/);
  out = await send(CLIENT_TG, "Bot Mijoz");
  assert.match(texts(out), /Telefon raqamingizni/);
  out = await send(CLIENT_TG, "+998901234567");
  assert.match(texts(out), /tugmasidan foydalaning/);
  out = await contact(CLIENT_TG, "998977770011", 12345);
  assert.match(texts(out), /oʻz raqamingizni/);
  out = await contact(CLIENT_TG, "998977770011");
  assert.match(texts(out), /Viloyatni tanlang/);
  console.log("✓ ism va telefon (faqat oʻz kontakti) qabul qilindi");

  const region = await prisma.region.findUniqueOrThrow({ where: { slug: "toshkent-shahri" } });
  const spec = await prisma.specialization.findUniqueOrThrow({ where: { slug: "oilaviy" } });
  out = await press(CLIENT_TG, `s:${spec.id}`); // notoʻgʻri bosqich
  assert.ok(out.some((c) => c.method === "answerCallbackQuery" && c.payload.show_alert));
  out = await press(CLIENT_TG, `r:${region.id}`);
  assert.match(texts(out), /Tumanni tanlang/);
  out = await press(CLIENT_TG, "d:-");
  assert.match(texts(out), /Muammo turini/);
  out = await press(CLIENT_TG, `s:${spec.id}`);
  assert.match(texts(out), /qisqacha yozing/);
  out = await send(CLIENT_TG, "qisqa");
  assert.match(texts(out), /10 dan 500/);
  out = await send(CLIENT_TG, "Turmush oʻrtogʻim bilan ajrashish boʻyicha maslahat kerak <test>.");
  assert.match(texts(out), /qanday bogʻlanish/);
  out = await press(CLIENT_TG, "m:TELEGRAM");
  assert.match(texts(out), /maxfiylik siyosati/);
  assert.match(texts(out), /&lt;test&gt;/, "foydalanuvchi matni HTML-ekranlanishi kerak");
  out = await press(CLIENT_TG, "ok");
  assert.match(texts(out), /Murojaatingiz qabul qilindi/);
  console.log("✓ dialog yakunlandi, murojaat yaratildi");

  const req = await prisma.request.findFirstOrThrow({
    where: { phone: CLIENT_PHONE },
    orderBy: { createdAt: "desc" },
    include: { client: true, assignments: { include: { lawyer: true } } },
  });
  assert.equal(req.source, "TELEGRAM");
  assert.equal(req.status, "YUBORILDI");
  assert.equal(req.contactMethod, "TELEGRAM");
  assert.equal(req.client?.telegramId, String(CLIENT_TG));
  assert.ok(req.assignments.length >= 2, "kamida 2 advokatga yuborilishi kerak");
  console.log(`✓ ${req.code}: ${req.assignments.length} ta advokatga yuborildi`);

  out = await send(CLIENT_TG, "📂 Mening murojaatlarim");
  assert.match(texts(out), new RegExp(req.code));
  console.log("✓ “Mening murojaatlarim”");

  // ---- 2. Advokatlarni bogʻlash ----
  const [a1, a2] = req.assignments;
  for (const [a, tg] of [
    [a1, LAWYER_TG],
    [a2, LAWYER2_TG],
  ] as const) {
    await prisma.lawyerProfile.update({ where: { id: a.lawyerId }, data: { telegramLinkCode: tg === LAWYER_TG ? "AAAA1111" : "BBBB2222" } });
  }
  out = await send(LAWYER_TG, "/start link_ZZZZ9999");
  assert.match(texts(out), /notoʻgʻri/);
  out = await send(LAWYER_TG, "/start link_AAAA1111");
  assert.match(texts(out), /bogʻlandi/);
  out = await send(LAWYER2_TG, "/start link_BBBB2222");
  assert.match(texts(out), /bogʻlandi/);
  console.log("✓ advokatlar bir martalik kod bilan bogʻlandi");

  out = await send(CLIENT_TG, "📥 Yangi murojaatlar");
  assert.ok(out.length >= 0);
  out = await press(CLIENT_TG, `acc:${a1.id}`);
  assert.ok(out.some((c) => c.method === "answerCallbackQuery" && c.payload.show_alert), "mijoz qabul qila olmasligi kerak");

  out = await send(LAWYER_TG, "📥 Yangi murojaatlar");
  assert.match(texts(out), new RegExp(req.code));
  assert.doesNotMatch(texts(out), /977770011|97 777 00 11/, "qabul qilinmaguncha telefon koʻrinmasligi kerak");
  console.log("✓ advokat “Yangi murojaatlar” — kontaktlarsiz");

  // ---- 3. Qabul qilish (birinchi gʻolib) ----
  out = await press(LAWYER_TG, `acc:${a1.id}`);
  assert.match(texts(out), /sizga biriktirildi/);
  assert.match(texts(out), /\+998 97 777 00 11/);
  out = await press(LAWYER2_TG, `acc:${a2.id}`);
  assert.match(texts(out), /band qilindi/);
  console.log("✓ birinchi qabul qilgan gʻolib, ikkinchisi “band qilindi”");

  out = await press(LAWYER2_TG, `st:Y:${req.id}`);
  assert.ok(out.some((c) => c.method === "answerCallbackQuery" && c.payload.show_alert), "begona advokat holatni oʻzgartira olmaydi");
  out = await press(LAWYER_TG, `st:J:${req.id}`);
  assert.match(texts(out), /Jarayonda/);
  out = await press(LAWYER_TG, `st:Y:${req.id}`);
  assert.match(texts(out), /Yopildi/);
  const closed = await prisma.request.findUniqueOrThrow({ where: { id: req.id } });
  assert.equal(closed.status, "YOPILDI");
  assert.ok(closed.reviewToken);
  console.log("✓ holatlar: JARAYONDA → YOPILDI, baho tokeni yaratildi");

  // ---- 4. Til ----
  out = await press(CLIENT_TG, "lang:ru");
  assert.match(texts(out), /Язык изменён/);
  out = await send(CLIENT_TG, "/sorov");
  assert.match(texts(out), /Выберите регион/, "ism va raqam qayta soʻralmaydi");
  out = await press(CLIENT_TG, "x");
  assert.match(texts(out), /Отменено/);
  console.log("✓ til almashtirish va bekor qilish");

  // ---- 5. Obuna eslatmasi ----
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { lawyerId: a1.lawyerId } });
  await prisma.subscription.update({ where: { id: sub.id }, data: { endsAt: new Date(Date.now() + 2 * 86400_000), remindedAt: null } });
  const r1 = await processSubscriptions();
  const r2 = await processSubscriptions();
  assert.ok(r1.reminded >= 1);
  assert.equal(r2.reminded, 0, "eslatma bir marta yuboriladi");
  await prisma.subscription.update({ where: { id: sub.id }, data: { endsAt: sub.endsAt, remindedAt: null } });
  console.log("✓ obuna eslatmasi (3 kun oldin, bir marta)");

  // ---- 6. Saytdagi telefon tasdigʻi (SMS oʻrniga) ----
  const VTG = 777000111;
  const token = "simVerifyToken_abcdefghijklmn";
  await prisma.phoneVerification.deleteMany({ where: { telegramId: { in: [String(VTG), String(VTG + 1)] } } });
  out = await send(VTG, `/start v_${token}`);
  assert.match(texts(out), /tasdiqlash uchun/);
  assert.ok(JSON.stringify(out).includes("request_contact"), "kontakt tugmasi koʻrsatiladi");
  out = await send(VTG, "901112233");
  assert.match(texts(out), /tugmasidan foydalaning/, "raqamni qoʻlda yozish qabul qilinmaydi");
  out = await contact(VTG, "+998901112233", 999);
  assert.match(texts(out), /oʻz raqamingiz/, "birovning kontakti rad etiladi");
  out = await contact(VTG, "998901112233");
  assert.match(texts(out), /tasdiqlandi/);
  const v = await prisma.phoneVerification.findUniqueOrThrow({ where: { id: token } });
  assert.equal(v.phone, "+998901112233");
  assert.ok(v.confirmedAt);
  out = await send(VTG + 1, `/start v_${token}`);
  assert.match(texts(out), /eskirgan yoki notoʻgʻri/, "token boshqa Telegram hisobiga oʻtmaydi");
  out = await send(VTG, "/start v_short");
  assert.match(texts(out), /eskirgan yoki notoʻgʻri/);
  await prisma.phoneVerification.deleteMany({ where: { telegramId: { in: [String(VTG), String(VTG + 1)] } } });
  console.log("✓ saytdagi telefon tasdigʻi: faqat oʻz kontakti, token boshqa hisobga oʻtmaydi");

  console.log("\nBarcha bot ssenariylari muvaffaqiyatli ✔");
}

main()
  .catch((e) => {
    console.error("✗", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
