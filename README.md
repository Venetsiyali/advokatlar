# AdvokatKerak — advokat topish platformasi

Oʻzbekiston boʻylab mijozlarni litsenziyasi tekshirilgan advokatlar bilan bogʻlaydigan veb-platforma va Telegram bot.

- **Mijoz** muammosini qisqacha yozadi (sayt yoki Telegram bot), hudud va yoʻnalishni tanlaydi. Telefon SMS kod bilan tasdiqlanadi.
- Tizim murojaatni mos (hudud + yoʻnalish + tasdiqlangan + obunasi faol) advokatlarning birinchi guruhiga yuboradi. **Birinchi qabul qilgan advokat gʻolib**. 2 soatda javob boʻlmasa, keyingi guruhga yuboriladi. 24 soatdan keyin adminga signal boradi.
- Mijoz telefoni **faqat murojaatni qabul qilgan advokatga** koʻrinadi. Ish yopilgach, mijozga baho qoldirish havolasi yuboriladi.
- **Advokat** profil va hujjatlarini yuklaydi. Moderatsiyadan soʻng katalogda chiqadi va oylik obuna (Payme/Click) bilan murojaat oladi.
- **Admin** advokatlarni tasdiqlaydi, murojaatlarni qoʻlda biriktiradi, izohlarni moderatsiya qiladi, maqola va sahifalarni tahrirlaydi, tarif va sozlamalarni boshqaradi. Har bir harakat jurnalga yoziladi.

Tillar: oʻzbekcha (lotin, standart), oʻzbekcha (kirill), ruscha.

---

## Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Sayt | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, next-intl |
| Baza | PostgreSQL + Prisma |
| Kirish | Auth.js (SMS OTP — Eskiz.uz, Telegram Login) |
| Bot | grammY (webhook): Docker'da alohida jarayon (`bot/`), Vercel'da `/api/telegram/webhook` |
| Toʻlov | Payme Merchant API, Click SHOP API |
| Fayllar | S3-mos xotira yoki lokal disk (imzolangan havolalar) |
| Testlar | Vitest (unit), Playwright (e2e), bot va toʻlov simulyatsiyalari |
| Joylash | Vercel + Supabase yoki Docker Compose (sayt, bot, PostgreSQL, ixtiyoriy Caddy/HTTPS) |

## Loyiha tuzilmasi

```
src/app/[locale]/        sahifalar (ochiq, kabinet, admin)
src/app/api/             OTP, fayllar, cron, toʻlov webhook'lari, health
src/server/              biznes-mantiq: matching, bildirishnomalar, admin va toʻlov amallari
src/lib/                 yordamchi modullar (SMS, Telegram, xotira, SEO, toʻlov imzolari...)
bot/                     Telegram bot (grammY), bot/test/simulate.ts — oflayn ssenariy testi
messages/                tarjimalar: uz.json, ru.json; uz-Cyrl.json — avtomatik (npm run i18n:cyrl)
prisma/                  sxema, migratsiyalar, seed (prisma/data/ — hududlar, mavzular, sahifalar)
e2e/                     Playwright testlari
scripts/                 lokal baza, kirill generatori, toʻlov simulyatsiyasi, standalone server
deploy/Caddyfile         HTTPS reverse proxy
```

> Interfeys matnlari kodga yozilmaydi — faqat `messages/*.json` da. `uz.json` oʻzgarsa: `npm run i18n:cyrl`.

---

## Lokal ishga tushirish

Talablar: **Node.js 22+**. Docker shart emas, PostgreSQL ichki (embedded) ishga tushiriladi.

```bash
npm ci
cp .env.example .env
```

`.env` ichida:
- `AUTH_SECRET`: istalgan uzun tasodifiy qator (`openssl rand -base64 32`).
- `OTP_DEV_ECHO="1"`: SMS kodi sahifada koʻrsatiladi (Eskiz kalitlari boʻlmaganda).

```bash
npm run db:local          # PostgreSQL :5433 (alohida terminalda ochiq qoldiring)
npx prisma migrate deploy
npm run db:seed           # lokal rejimda demo advokat va mijozlar bilan
npm run dev               # http://localhost:3000
```

Demo maʼlumotlar bilan kirish (SMS kodi sahifada chiqadi):
- admin: `+998 90 000 00 00` → `/admin`
- advokat: `+998 93 100 00 00` … `+998 93 100 00 19`
- mijoz: istalgan yangi raqam

### Mock rejimlar

Kalitlar boʻsh boʻlsa, tashqi xizmatlar oʻrniga mock ishlaydi va hamma narsani lokal sinash mumkin:

| Xizmat | Kalit yoʻq boʻlganda |
|---|---|
| Eskiz SMS | matn server logiga yoziladi |
| Telegram bot/bildirishnomalar | xabarlar konsolga yoziladi, bot ishga tushmaydi |
| Cloudflare Turnstile | tekshiruv oʻtkazib yuboriladi |
| S3 | fayllar `./storage` papkasida, HMAC-imzolangan havolalar |
| Payme / Click | test toʻlov sahifasi (faqat development; productionda `PAYMENTS_MOCK=1` bilan) |
| GA4 / Yandex Metrica | skriptlar yuklanmaydi |

### Telegram botni lokal sinash

```bash
npm run bot:simulate      # tokensiz: soxta update'lar bilan barcha ssenariylar
npm run bot:dev           # haqiqiy token bilan, polling rejimi (TELEGRAM_BOT_TOKEN .env da)
```

---

## Testlar

```bash
npm test                  # unit: matching, toʻlov imzolari, HTML tozalash, transliteratsiya
npm run payments:simulate # Payme va Click webhook'larining toʻliq hayot sikli (lokal bazada)
npm run bot:simulate      # Telegram bot ssenariylari
npm run build && npm run test:e2e   # Playwright: ochiq sahifalar, murojaat → qabul qilish, admin, mobil
```

E2E testlar uchun lokal baza ishlab turishi va demo maʼlumotlar (`npm run db:seed`) kerak. Testlar standalone serverni 3200-portda oʻzi ishga tushiradi. Yaratilgan test maʼlumotlar (`+99899…` raqamlar) oxirida oʻchiriladi. Birinchi marta: `npx playwright install chromium`.

---

## Production: Vercel + Supabase

Sayt Vercel'da (serverless), baza va fayllar Supabase'da. Telegram bot alohida server talab qilmaydi: u `/api/telegram/webhook` route sifatida ishlaydi.

> ⚠️ Vercel va Supabase serverlari Oʻzbekistonda emas. Bu variantda fuqarolarning shaxsga doir maʼlumotlari chet elda saqlanadi. Pastdagi “Maʼlumotlarni lokalizatsiya qilish” boʻlimini oʻqing. Qonun talabiga toʻliq mos joylash — Oʻzbekistondagi serverda Docker Compose.

### 1. Supabase (Vercel integratsiyasi orqali — tavsiya etiladi)

Vercel loyihasida **Storage → Connect Database → Supabase** (yoki **Integrations → Supabase**) orqali Supabase loyihasini ulang. Region tavsiyasi: **Frankfurt (eu-central-1)**. Vercel funksiyalari ham `fra1` da ishlaydi (`vercel.json`). **Production** muhiti belgilangan boʻlsin.

Integratsiya `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` va boshqa oʻzgaruvchilarni oʻzi qoʻshadi. Loyiha ularni avtomatik taniydi (`src/lib/supabase-env.ts`):
- `DATABASE_URL` ← `POSTGRES_PRISMA_URL` (pooler, `pgbouncer=true&connection_limit=1` qoʻshiladi);
- `DIRECT_URL` ← pooler'ning 5432 (session) porti — migratsiyalar uchun (Vercel build IPv4, `db.<ref>.supabase.co` esa faqat IPv6);
- fayllar ← Supabase Storage, server kaliti bilan. `documents` (yopiq) va `public` (ochiq) bucket'lari birinchi build'da **avtomatik yaratiladi**, S3 kalitlari kerak emas.

> Integratsiyasiz ham boʻladi: `DATABASE_URL` (Transaction pooler + `?pgbouncer=true&connection_limit=1`) va `DIRECT_URL` (Session pooler) ni qoʻlda kiriting; fayllar uchun `S3_*` (`.env.example`). Qoʻlda berilgan qiymatlar doim ustun.

### 2. Vercel

1. GitHub repozitoriyni Vercel'ga import qiling (**Add New → Project**). Build buyrugʻi `vercel.json` da (`npm run vercel-build`). Import paytida taklif qilinadigan **Prisma Postgres** va **Amazon S3** integratsiyalari kerak emas.
2. **Settings → Environment Variables** ga (Production) Supabase'dan tashqari faqat quyidagilar kerak:

| Oʻzgaruvchi | Qiymat |
|---|---|
| `AUTH_SECRET` | tasodifiy qator: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CRON_SECRET` | tasodifiy qator: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_PHONE` | birinchi admin raqami, `+998XXXXXXXXX` |
| `SEED_ON_BUILD` | birinchi deploy uchun `1` |
| `NEXT_PUBLIC_SITE_URL` | ixtiyoriy: oʻz domeningiz. Berilmasa — Vercel production domeni |
| `ESKIZ_*`, `TELEGRAM_*`, `PAYME_*`, `CLICK_*`, `NEXT_PUBLIC_*` | keyinroq, `.env.example` dagi tavsif boʻyicha |

3. **Deploy**. Build vaqtida migratsiyalar Supabase'ga qoʻllanadi. `SEED_ON_BUILD=1` boʻlsa, boshlangʻich maʼlumotlar va admin yaratiladi. Keyin `SEED_ON_BUILD` ni `0` qilish mumkin, qayta ishga tushsa ham zarar yoʻq.
4. Preview deploy'lar production bazasiga migratsiya qilmaydi. Ular `robots.txt` bilan qidiruvdan yopiladi.

### 3. Telegram bot (webhook)

Vercel'da `TELEGRAM_BOT_TOKEN` va `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`) berilgach, deploy'dan keyin bir marta bajaring:

```bash
curl -X POST -H "Authorization: Bearer <TELEGRAM_WEBHOOK_SECRET>" https://DOMEN/api/telegram/setup
```

Javobda webhook manzili koʻrinadi. Domen oʻzgarsa, buyruqni qayta bajaring.

### 4. Davriy vazifa (cron)

Javobsiz murojaatlarni 2 soatdan keyin keyingi guruhga yuborish va obuna muddatlari `/api/cron/dispatch` orqali ishlaydi.

- `vercel.json` da Vercel Cron **kuniga bir marta** sozlangan, chunki Hobby tarifi faqat kunlik cron'ga ruxsat beradi.
- To'g'ri ishlashi uchun **har 5 daqiqada** chaqirilishi kerak. Ikki yoʻl bor:
  - **Vercel Pro:** `vercel.json` dagi jadvalni `*/5 * * * *` ga oʻzgartiring.
  - **Bepul tashqi cron** (masalan cron-job.org): har 5 daqiqada `GET https://DOMEN/api/cron/dispatch`, sarlavha `Authorization: Bearer <CRON_SECRET>`.

### Vercel cheklovlari

- Yuklanadigan fayl hajmi **4 MB gacha** (Vercel soʻrov limiti 4.5 MB).
- Fayllar Supabase Storage'da saqlanadi (integratsiya yoki `S3_*`). Ikkalasi ham boʻlmasa, yuklash xato beradi — Vercel diski faqat oʻqish uchun.
- So'rovlar soni cheklovi (rate limit) har bir funksiya nusxasi xotirasida ishlaydi, shuning uchun serverless'da qatʼiy emas. OTP limitlari esa bazada, ular toʻliq ishlaydi.
- `PAYMENTS_MOCK` va `OTP_DEV_ECHO` production'da `0` boʻlishi shart.

---

## Production: Docker Compose

Serverda Docker va Docker Compose v2 boʻlishi kerak. **Server Oʻzbekiston hududida boʻlishi shart** (pastdagi boʻlimga qarang).

1. Sozlamalar:

   ```bash
   cp .env.example .env
   ```

   Majburiy maydonlar:
   - `NEXT_PUBLIC_SITE_URL` (`https://advokatkerak.uz`)
   - `AUTH_SECRET`
   - `POSTGRES_PASSWORD` (`openssl rand -hex 24`)
   - `ADMIN_PHONE`
   - `CRON_SECRET`
   - Eskiz, Telegram va toʻlov kalitlari

   `OTP_DEV_ECHO="0"` boʻlib qolishi kerak.

2. Birinchi ishga tushirish (migratsiya + boshlangʻich maʼlumotlar):

   ```bash
   docker compose up -d --build
   docker compose run --rm migrate npx prisma db seed
   ```

   `migrate` servisi har ishga tushganda migratsiyalarni qoʻllaydi. Seed hududlar, yoʻnalishlar, tarif, mavzu va maʼlumot sahifalarini hamda `ADMIN_PHONE` raqamli adminni yaratadi. Qayta ishga tushirish xavfsiz: mavjud yozuvlar oʻzgartirilmaydi. Productionda demo advokatlar **yaratilmaydi** (`SEED_DEMO=0`).

   Keyingi yangilanishlar:

   ```bash
   git pull && docker compose up -d --build
   ```

   Migratsiyalar avtomatik qoʻllanadi.

3. HTTPS. Variant A: oʻrnatilgan Caddy (Let's Encrypt). `.env` da `DOMAIN=advokatkerak.uz` boʻlishi kerak.

   ```bash
   docker compose --profile proxy up -d
   ```

   Variant B: oʻzingizning nginx. Sayt `127.0.0.1:3000` da, bot webhook'i `127.0.0.1:8081` da tinglaydi.

| Servis | Vazifa |
|---|---|
| `postgres` | PostgreSQL 17, maʼlumotlar `pgdata` hajmida; tashqariga ochilmagan |
| `migrate` | bir martalik: `prisma migrate deploy` (+ seed) |
| `web` | Next.js standalone server, yuklangan fayllar `storage` hajmida, health: `/api/health` |
| `bot` | Telegram bot, webhook rejimi |
| `caddy` | ixtiyoriy: HTTPS, webhook yoʻlini botga, qolganini saytga yoʻnaltiradi |

> `NEXT_PUBLIC_*` qiymatlari **build vaqtida** kodga joylanadi. Ularni oʻzgartirgandan soʻng `docker compose up -d --build` kerak.

### Tashqi xizmatlarni ulash

- **Telegram bot.** @BotFather'dan token olinadi va `.env` ga yoziladi:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`)
  - `BOT_WEBHOOK_URL=https://DOMEN`

  Bot ishga tushganda webhook'ni oʻzi oʻrnatadi. Admin signallari uchun `TELEGRAM_ADMIN_CHAT_ID`. Saytda Telegram orqali kirish uchun BotFather'da `/setdomain` bajariladi.
- **Payme.** Kassa sozlamalarida endpoint `https://DOMEN/api/payments/payme`, hisob maydoni `order_id`. Sinov kassasi uchun `PAYME_TEST=1`.
- **Click.**
  - Prepare: `https://DOMEN/api/payments/click/prepare`
  - Complete: `https://DOMEN/api/payments/click/complete`
- **Eskiz.** `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`. SMS shablonlari Eskiz'da oldindan tasdiqlangan boʻlishi kerak.
- **Davriy vazifa.** Murojaatlarni qayta yuborish va obuna muddatlari har 5 daqiqada sayt ichida tekshiriladi. Bir nechta `web` nusxasi boʻlsa, `ENABLE_INTERNAL_CRON=0` qiling va tashqi cron qoʻshing:

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://DOMEN/api/cron/dispatch
  ```

### Zaxira nusxa

```bash
# Baza (har kuni, masalan cron orqali)
docker compose exec -T postgres pg_dump -U advokat -Fc advokat > backup-$(date +%F).dump
# Yuklangan hujjatlar (hajm nomi = <loyiha papkasi>_storage, qarang: docker volume ls)
docker run --rm -v advokatkerak_storage:/data -v "$PWD":/backup alpine tar czf /backup/storage-$(date +%F).tgz -C /data .
# Tiklash
docker compose exec -T postgres pg_restore -U advokat -d advokat --clean < backup-YYYY-MM-DD.dump
```

Zaxira nusxalar ham Oʻzbekiston hududida saqlanishi kerak.

---

## Maʼlumotlarni lokalizatsiya qilish (Oʻzbekiston)

Oʻzbekiston Respublikasining “Shaxsga doir maʼlumotlar toʻgʻrisida”gi Qonuniga (27¹-modda, 2021-yildan) koʻra, **Oʻzbekiston fuqarolarining shaxsga doir maʼlumotlari Oʻzbekiston hududidagi texnik vositalarda (serverlarda) yigʻilishi, saqlanishi va qayta ishlanishi** hamda shaxsga doir maʼlumotlar bazalarining davlat reyestrida roʻyxatdan oʻtkazilishi talab etiladi. Platforma mijoz va advokatlarning ismi, telefoni, murojaat matni, litsenziya hujjatlari kabi maʼlumotlarni saqlaydi.

**Vercel + Supabase varianti bu talabga mos emas:** baza, fayllar va funksiyalar chet eldagi serverlarda (masalan, Frankfurt) ishlaydi. Bu variantni tanlashdan oldin yurist bilan maslahatlashing. Qonunga toʻliq mos joylash uchun quyidagi Docker Compose tavsiyalariga amal qiling.

Shunday qilib joylashtiring:
- **Server, PostgreSQL va fayl xotirasi** Oʻzbekistondagi data-markazda boʻlsin. Standart `docker-compose.yml` hamma narsani shu serverning disk hajmlarida saqlaydi. `S3_*` ishlatilsa, u ham Oʻzbekistondagi S3-mos xizmat boʻlishi kerak.
- **Zaxira nusxalar** ham Oʻzbekiston hududida saqlansin.
- **Chet el xizmatlariga uzatiladigan maʼlumotlar:**
  - **Telegram.** Bot orqali murojaat qilgan mijoz maʼlumotlari Telegram serverlaridan oʻtadi. Murojaatni qabul qilgan advokatga mijoz ismi, telefoni va murojaat matni Telegram xabarida yuboriladi. Advokatga yuborilmasligini xohlasangiz, `src/server/telegram-ui.ts` dagi `acceptedCard` ni faqat kabinet havolasi bilan cheklang.
  - **Google Analytics / Yandex Metrica.** IP va brauzer maʼlumotlari yuboriladi. Kabinet, admin va baho sahifalarida analitika oʻchirilgan. Hodisalarga shaxsiy maʼlumot qoʻshilmaydi.
  - **Cloudflare Turnstile.** Tashrif buyuruvchining IP manzili yuboriladi.
  - **Eskiz.uz** — Oʻzbekiston xizmati.
- Maxfiylik siyosati va ommaviy ofertada (`/admin/sahifalar`) operator rekvizitlari va yuqoridagi uzatishlar aniq koʻrsatilsin. Seed'dagi matnlar **qoralama**: ishga tushirishdan oldin yurist tekshirishi shart.

> Bu boʻlim huquqiy maslahat emas. Talablar oʻzgarishi mumkin. Ishga tushirishdan oldin amaldagi qonunchilikni yurist bilan tekshiring.

---

## Xavfsizlik

- **Kirish:**
  - SMS OTP kodlari HMAC-hash koʻrinishida saqlanadi, 5 daqiqa amal qiladi, 5 urinishgacha.
  - Bitta raqamga 60 soniyada bitta kod, soatiga koʻpi bilan 5 ta.
  - Rol har soʻrovda bazadan tekshiriladi. Bloklangan foydalanuvchi darhol chiqariladi.
- **Mijoz telefoni** faqat biriktirilgan advokat va adminga koʻrinadi (sayt, Telegram, API).
- **Kiruvchi maʼlumotlar:**
  - Barcha kiruvchi maʼlumotlar zod bilan tekshiriladi.
  - Server action'lar Next.js tomonidan Origin tekshiruvi bilan himoyalangan (CSRF).
  - Formalarda rate limit va Cloudflare Turnstile.
- **Fayllar:**
  - Turi magic-bytes boʻyicha tekshiriladi, hajmi 4 MB gacha (Vercel soʻrov limiti 4.5 MB).
  - Hujjatlar faqat qisqa muddatli imzolangan havola orqali ochiladi.
- **Admin tahrirlovchisidan kelgan HTML** sanitize-html bilan tozalanadi. JSON-LD ekranlanadi.
- **Toʻlov webhook'lari:**
  - Payme: Basic auth, doimiy vaqtli taqqoslash.
  - Click: MD5 imzo.
  - Ikkalasi ham idempotent: takroriy soʻrov obunani ikki marta uzaytirmaydi.
- **Kuzatuv:**
  - Har bir admin harakati `AuditLog` ga yoziladi (`/admin/jurnal`).
  - `robots.txt` admin, kabinet va API ni yopadi. Staging serverda `ROBOTS_NOINDEX=1`.

## Ishga tushirishdan oldingi tekshiruv roʻyxati

- [ ] Server va zaxira nusxalar Oʻzbekistonda; shaxsga doir maʼlumotlar bazasi reyestrda roʻyxatdan oʻtkazilgan
- [ ] `AUTH_SECRET`, `POSTGRES_PASSWORD`, `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET` — kuchli tasodifiy qiymatlar
- [ ] `OTP_DEV_ECHO=0`, `PAYMENTS_MOCK=0`, `SEED_DEMO=0`
- [ ] Eskiz SMS shablonlari tasdiqlangan; Payme va Click sinov kassalarida tekshirilgan
- [ ] Maxfiylik siyosati va oferta yurist tomonidan tekshirilgan, `[Kompaniya nomi]` va rekvizitlar toʻldirilgan
- [ ] `NEXT_PUBLIC_OPERATOR_INFO` (footer) toʻldirilgan
- [ ] HTTPS ishlaydi, `https://DOMEN/sitemap.xml` Google Search Console va Yandex Webmaster'ga qoʻshilgan
- [ ] Zaxira nusxa cron'i sozlangan va tiklash sinab koʻrilgan
