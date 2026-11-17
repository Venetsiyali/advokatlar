import { PrismaClient } from "@prisma/client";
import { REGIONS, SPECIALIZATIONS } from "./data/regions";
import { TOPICS, ARTICLES } from "./data/content";
import { PAGES } from "./data/pages";
import { SEO_ARTICLES } from "./data/articles";
import { latinToCyrillic, slugify } from "../src/lib/translit";

const prisma = new PrismaClient();

// Deterministik tasodifiy sonlar — seed har safar bir xil natija bersin
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const pickMany = <T,>(arr: T[], n: number) => [...arr].sort(() => rnd() - 0.5).slice(0, n);

const FIRST_M = ["Akmal", "Bobur", "Dilshod", "Jasur", "Sardor", "Rustam", "Otabek", "Sherzod", "Ulugʻbek", "Farrux", "Aziz", "Jamshid"];
const FIRST_F = ["Dilnoza", "Gulnora", "Malika", "Nilufar", "Shahnoza", "Zarina", "Kamola", "Madina"];
const LAST = ["Karimov", "Toshmatov", "Rahimov", "Yusupov", "Saidov", "Abdullayev", "Ismoilov", "Nazarov", "Qodirov", "Hasanov", "Ergashev", "Mirzayev", "Sobirov", "Xolmatov"];
const PATR_M = ["Anvarovich", "Baxtiyorovich", "Rustamovich", "Shavkatovich", "Olimovich", "Ravshanovich"];
const PATR_F = ["Anvarovna", "Baxtiyorovna", "Rustamovna", "Shavkatovna", "Olimovna", "Ravshanovna"];
const UNIS = [
  "Toshkent davlat yuridik universiteti",
  "Jahon iqtisodiyoti va diplomatiya universiteti",
  "Samarqand davlat universiteti, yuridik fakulteti",
  "Andijon davlat universiteti, huquqshunoslik",
];
const BUREAUS = ["“Adolat” advokatlik byurosi", "“Himoya” advokatlik firmasi", "Xususiy amaliyot", "“Ishonch” advokatlar hayʼati", "“Huquq va Burch” byurosi"];
const REVIEW_TEXTS = [
  "Juda tez javob berdi, ishimni batafsil tushuntirdi.",
  "Professional yondashuv, natijadan mamnunman.",
  "Sudda yaxshi himoya qildi, rahmat!",
  "Maslahat aniq va tushunarli boʻldi.",
  "Hujjatlarni tez tayyorlab berdi.",
  "Muloyim va eʼtiborli mutaxassis.",
];

async function main() {
  // Demo maʼlumotlar: lokal ishlab chiqishda standart yoqilgan, productionda SEED_DEMO=0
  const demo = (process.env.SEED_DEMO ?? (process.env.NODE_ENV === "production" || process.env.VERCEL ? "0" : "1")) === "1";
  console.log("Seed boshlandi…");

  // Sozlamalar
  const settings: Record<string, unknown> = {
    trialDays: 30,
    trialDeadline: "2027-06-30",
    monthlyPriceUzs: 99000,
    dispatchBatchSize: 4,
    dispatchTimeoutHours: 2,
    adminAlertHours: 24,
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: value as never } });
  }

  // Tarif
  await prisma.plan.upsert({
    where: { slug: "oylik" },
    update: {},
    create: {
      slug: "oylik",
      nameUz: "Oylik obuna",
      nameUzCyrl: latinToCyrillic("Oylik obuna"),
      nameRu: "Ежемесячная подписка",
      priceUzs: 99000,
      periodDays: 30,
      features: ["unlimitedRequests", "profileInCatalog", "telegramAlerts", "ratingParticipation"],
    },
  });

  // Hududlar va tumanlar
  for (const [i, r] of REGIONS.entries()) {
    const region = await prisma.region.upsert({
      where: { slug: r.slug },
      update: { nameUz: r.nameUz, nameRu: r.nameRu, nameUzCyrl: latinToCyrillic(r.nameUz), sortOrder: i },
      create: { slug: r.slug, nameUz: r.nameUz, nameRu: r.nameRu, nameUzCyrl: latinToCyrillic(r.nameUz), sortOrder: i },
    });
    for (const d of r.districts) {
      const slug = slugify(d);
      const cyr = latinToCyrillic(d);
      await prisma.district.upsert({
        where: { regionId_slug: { regionId: region.id, slug } },
        update: {},
        create: { regionId: region.id, slug, nameUz: d, nameUzCyrl: cyr, nameRu: cyr.replace(/ш\.$/, "г.") },
      });
    }
  }

  // Yoʻnalishlar
  for (const [i, sp] of SPECIALIZATIONS.entries()) {
    await prisma.specialization.upsert({
      where: { slug: sp.slug },
      update: {},
      create: { ...sp, nameUzCyrl: latinToCyrillic(sp.nameUz), sortOrder: i },
    });
  }

  const regions = await prisma.region.findMany({ include: { districts: true } });
  const specs = await prisma.specialization.findMany();
  const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: "oylik" } });

  // Admin: ADMIN_PHONE (productionda majburiy). Demo rejimda standart test raqami.
  const adminPhone = process.env.ADMIN_PHONE || (demo ? "+998900000000" : "");
  if (adminPhone) {
    if (!/^\+998\d{9}$/.test(adminPhone)) throw new Error("ADMIN_PHONE formati: +998XXXXXXXXX");
    await prisma.user.upsert({
      where: { phone: adminPhone },
      update: { role: "ADMIN" },
      create: { phone: adminPhone, role: "ADMIN", name: "Administrator" },
    });
    console.log(`Admin: ${adminPhone}`);
  } else {
    console.warn("ADMIN_PHONE berilmagan — admin yaratilmadi");
  }

  // Demo maʼlumotlar (test mijozlar, 20 ta advokat, izohlar) — faqat SEED_DEMO=1 da
  if (demo) {
    // Test mijozlar (izohlar uchun)
    const clients = [];
    for (let i = 0; i < 8; i++) {
      const phone = `+99891000000${i}`;
      clients.push(
        await prisma.user.upsert({
          where: { phone },
          update: {},
          create: { phone, name: `${pick(FIRST_M.concat(FIRST_F))} ${pick(LAST)[0]}.`, role: "CLIENT" },
        }),
      );
    }

    // 20 ta test advokat
    const weighted = [
      ...Array(6).fill("toshkent-shahri"),
      ...Array(2).fill("toshkent-viloyati"),
      ...REGIONS.map((r) => r.slug),
    ] as string[];

    for (let i = 0; i < 20; i++) {
      const female = rnd() < 0.35;
      const first = female ? pick(FIRST_F) : pick(FIRST_M);
      const lastBase = pick(LAST);
      const last = female ? `${lastBase}a` : lastBase;
      const patr = female ? pick(PATR_F) : pick(PATR_M);
      const fullName = `${last} ${first} ${patr}`;
      const slug = `${slugify(first)}-${slugify(last)}-${i + 1}`;
      const regionSlug = weighted[i % weighted.length] ?? pick(REGIONS).slug;
      const region = regions.find((r) => r.slug === regionSlug)!;
      const district = pick(region.districts);
      const status = i < 18 ? "TASDIQLANGAN" : "KUTILMOQDA";
      const phone = `+99893${String(1000000 + i).padStart(7, "0")}`;

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: { phone, role: "LAWYER", name: fullName },
      });

      const exists = await prisma.lawyerProfile.findUnique({ where: { userId: user.id } });
      if (exists) continue;

      const mySpecs = pickMany(specs, 2 + Math.floor(rnd() * 3));
      const exp = 2 + Math.floor(rnd() * 22);
      const langs = rnd() < 0.8 ? ["uz", "ru"] : rnd() < 0.5 ? ["uz", "ru", "en"] : ["uz"];
      const lawyer = await prisma.lawyerProfile.create({
        data: {
          userId: user.id,
          slug,
          fullName,
          bio: `${exp} yildan beri advokatlik faoliyati bilan shugʻullanaman. Asosiy yoʻnalishlarim: ${mySpecs
            .map((x) => x.nameUz.toLowerCase())
            .join(", ")}. Har bir mijozning ishini maxfiy saqlayman va natijaga yoʻnaltirilgan holda ishlayman.`,
          education: pick(UNIS),
          workplace: pick(BUREAUS),
          experienceYears: exp,
          languages: langs,
          licenseNumber: `AL-${String(10000 + Math.floor(rnd() * 89999))}`,
          licenseVerified: status === "TASDIQLANGAN",
          consultationFee: rnd() < 0.5 ? null : 50000 + Math.floor(rnd() * 6) * 50000,
          status,
          isOnDuty: rnd() < 0.3,
          avgResponseMins: 5 + Math.floor(rnd() * 90),
          regionId: region.id,
          districtId: district.id,
          specializations: { create: mySpecs.map((sp) => ({ specializationId: sp.id })) },
        },
      });

      await prisma.subscription.create({
        data: {
          lawyerId: lawyer.id,
          planId: plan.id,
          status: i % 7 === 6 ? "MUDDATI_OTGAN" : "SINOV",
          endsAt: new Date(Date.now() + (i % 7 === 6 ? -5 : 30) * 86400000),
        },
      });

      if (status === "TASDIQLANGAN") {
        const n = Math.floor(rnd() * 6);
        let sum = 0;
        for (let k = 0; k < n; k++) {
          const rating = rnd() < 0.75 ? 5 : 4;
          sum += rating;
          const author = pick(clients);
          await prisma.review.create({
            data: {
              lawyerId: lawyer.id,
              authorId: author.id,
              authorName: author.name ?? "Mijoz",
              rating,
              comment: pick(REVIEW_TEXTS),
              status: "TASDIQLANGAN",
              createdAt: new Date(Date.now() - Math.floor(rnd() * 60) * 86400000),
            },
          });
        }
        if (n > 0) {
          await prisma.lawyerProfile.update({
            where: { id: lawyer.id },
            data: { rating: Math.round((sum / n) * 10) / 10, reviewCount: n },
          });
        }
      }
    }
  }

  // Mavzu sahifalari
  for (const [i, t] of TOPICS.entries()) {
    const spec = specs.find((x) => x.slug === t.spec);
    await prisma.topicPage.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        slug: t.slug,
        title: t.title,
        titleUzCyrl: latinToCyrillic(t.title),
        titleRu: t.titleRu,
        summary: t.summary,
        content: t.content,
        icon: t.icon,
        specializationId: spec?.id,
        showOnHome: i < 8,
        sortOrder: i,
      },
    });
  }

  // Maqolalar
  for (const [i, a] of ARTICLES.entries()) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        ...a,
        published: true,
        publishedAt: new Date(Date.now() - (i + 1) * 5 * 86400000),
      },
    });
  }

  // SEO maqolalar — qoralama; mavjud boʻlsa tegilmaydi (admin tahriri va eʼlon holati saqlanadi)
  for (const a of SEO_ARTICLES) {
    await prisma.article.upsert({ where: { slug: a.slug }, update: {}, create: { ...a, published: false } });
  }

  // Maʼlumot sahifalari (admin panelda tahrirlanadi — mavjud boʻlsa tegilmaydi)
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "AdvokatBor";
  for (const pg of PAGES) {
    const contentUz = pg.contentUz.replaceAll("{brand}", brand).replace(/\n/g, "");
    const contentRu = pg.contentRu.replaceAll("{brand}", brand).replace(/\n/g, "");
    await prisma.staticPage.upsert({
      where: { slug: pg.slug },
      update: {},
      create: {
        slug: pg.slug,
        titleUz: pg.titleUz,
        titleUzCyrl: latinToCyrillic(pg.titleUz),
        titleRu: pg.titleRu,
        contentUz,
        // {brand} oʻrinbosari transliteratsiyadan himoyalangan — nom lotincha qoladi
        contentUzCyrl: latinToCyrillic(pg.contentUz).replaceAll("{brand}", brand).replace(/\n/g, ""),
        contentRu,
      },
    });
  }

  console.log("Seed tugadi ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
