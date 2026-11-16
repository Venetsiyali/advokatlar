// Maʼlumot sahifalari uchun boshlangʻich matnlar. Huquqiy hujjatlar (maxfiylik siyosati, oferta) —
// QORALAMA: ishga tushirishdan oldin yurist tomonidan tekshirilib, [qavs] ichidagi maʼlumotlar toʻldirilishi shart.
// Admin panel → Maʼlumot sahifalari boʻlimida tahrirlanadi.

export type PageSeed = { slug: string; titleUz: string; titleRu: string; contentUz: string; contentRu: string };

export const PAGES: PageSeed[] = [
  {
    slug: "biz-haqimizda",
    titleUz: "Biz haqimizda",
    titleRu: "О нас",
    contentUz: `<p>{brand} — Oʻzbekiston boʻylab mijozlarni litsenziyaga ega advokatlar bilan bogʻlaydigan onlayn platforma. Maqsadimiz — huquqiy yordamni tez, tushunarli va ishonchli qilish.</p>
<h2>Qanday ishlaymiz</h2>
<ul><li>Mijoz muammosini qisqacha yozadi, hudud va yoʻnalishni tanlaydi.</li><li>Tizim murojaatni shu hudud va yoʻnalishdagi tasdiqlangan advokatlarga yuboradi.</li><li>Birinchi qabul qilgan advokat mijoz bilan bogʻlanadi.</li><li>Ish yakunlangach, mijoz advokatga baho qoldiradi.</li></ul>
<h2>Ishonch</h2>
<p>Har bir advokatning litsenziyasi va hujjatlari moderatorlar tomonidan tekshiriladi. Reyting faqat haqiqiy mijozlarning moderatsiyadan oʻtgan baholariga asoslanadi.</p>
<p>Platforma advokatlik faoliyatini amalga oshirmaydi va huquqiy maslahat bermaydi — biz mijoz va advokat oʻrtasida aloqa oʻrnatamiz.</p>`,
    contentRu: `<p>{brand} — онлайн-платформа, которая связывает клиентов с лицензированными адвокатами по всему Узбекистану. Наша цель — сделать юридическую помощь быстрой, понятной и надёжной.</p>
<h2>Как мы работаем</h2>
<ul><li>Клиент кратко описывает проблему, выбирает регион и направление.</li><li>Система отправляет заявку подтверждённым адвокатам этого региона и направления.</li><li>Первый принявший заявку адвокат связывается с клиентом.</li><li>После завершения клиент оценивает работу адвоката.</li></ul>
<h2>Доверие</h2>
<p>Лицензия и документы каждого адвоката проверяются модераторами. Рейтинг основан только на прошедших модерацию оценках реальных клиентов.</p>
<p>Платформа не осуществляет адвокатскую деятельность и не даёт юридических консультаций — мы помогаем клиенту и адвокату найти друг друга.</p>`,
  },
  {
    slug: "aloqa",
    titleUz: "Aloqa",
    titleRu: "Контакты",
    contentUz: `<p>Savol, taklif yoki shikoyatingiz boʻlsa, biz bilan bogʻlaning. Ish kunlari soat 9:00 dan 18:00 gacha javob beramiz.</p>
<p>Advokat kerak boʻlsa — toʻgʻridan-toʻgʻri murojaat qoldiring: bu tezroq.</p>`,
    contentRu: `<p>Если у вас есть вопрос, предложение или жалоба, свяжитесь с нами. Мы отвечаем в рабочие дни с 9:00 до 18:00.</p>
<p>Если вам нужен адвокат — сразу оставьте заявку: так быстрее.</p>`,
  },
  {
    slug: "maxfiylik-siyosati",
    titleUz: "Maxfiylik siyosati",
    titleRu: "Политика конфиденциальности",
    contentUz: `<p>Ushbu siyosat {brand} platformasi ([Kompaniya nomi], STIR: [—], manzil: [—]) foydalanuvchilarning shaxsiy maʼlumotlarini qanday yigʻishi, saqlashi va himoya qilishini belgilaydi. Siyosat Oʻzbekiston Respublikasining “Shaxsga doir maʼlumotlar toʻgʻrisida”gi Qonuniga muvofiq tuzilgan.</p>
<h2>1. Qanday maʼlumotlar yigʻiladi</h2>
<ul><li>Mijozlar: ism, telefon raqami, hudud, murojaat matni va ilova qilingan fayl, Telegram ID (bot orqali murojaat qilinganda).</li><li>Advokatlar: F.I.Sh., telefon raqami, litsenziya raqami va hujjatlar nusxalari, ish joyi, taʼlim, rasm.</li><li>Texnik maʼlumotlar: IP-manzil, brauzer turi, tashrif vaqti.</li></ul>
<h2>2. Maʼlumotlardan foydalanish maqsadi</h2>
<ul><li>Murojaatni mos advokatga yetkazish.</li><li>Telefon raqamini tasdiqlash (SMS kod) va bildirishnomalar yuborish.</li><li>Advokat hujjatlarini tekshirish va platforma xavfsizligini taʼminlash.</li></ul>
<h2>3. Maʼlumotlarni uchinchi shaxslarga berish</h2>
<p>Mijozning telefon raqami faqat murojaatni qabul qilgan advokatga koʻrsatiladi. Murojaatni qabul qilmagan advokatlar mijoz kontaktlarini koʻrmaydi. Maʼlumotlar qonunda nazarda tutilgan hollardan tashqari uchinchi shaxslarga berilmaydi.</p>
<h2>4. Saqlash joyi va muddati</h2>
<p>Oʻzbekiston fuqarolarining shaxsga doir maʼlumotlari qonun talabiga koʻra Oʻzbekiston Respublikasi hududidagi serverlarda saqlanadi. Maʼlumotlar foydalanish maqsadiga erishilgunga qadar yoki foydalanuvchi oʻchirishni soʻraguniga qadar saqlanadi.</p>
<h2>5. Foydalanuvchi huquqlari</h2>
<p>Siz oʻz maʼlumotlaringiz bilan tanishish, ularni tuzatish yoki oʻchirishni talab qilish huquqiga egasiz. Buning uchun [elektron pochta] manziliga yozing.</p>
<h2>6. Oʻzgartirishlar</h2>
<p>Siyosat yangilanganda yangi tahrir shu sahifada eʼlon qilinadi.</p>`,
    contentRu: `<p>Настоящая политика определяет, как платформа {brand} ([Название компании], ИНН: [—], адрес: [—]) собирает, хранит и защищает персональные данные пользователей. Политика составлена в соответствии с Законом Республики Узбекистан «О персональных данных».</p>
<h2>1. Какие данные собираются</h2>
<ul><li>Клиенты: имя, номер телефона, регион, текст заявки и приложенный файл, Telegram ID (при обращении через бот).</li><li>Адвокаты: ФИО, номер телефона, номер лицензии и копии документов, место работы, образование, фото.</li><li>Технические данные: IP-адрес, тип браузера, время посещения.</li></ul>
<h2>2. Цели использования</h2>
<ul><li>Передача заявки подходящему адвокату.</li><li>Подтверждение номера телефона (SMS-код) и отправка уведомлений.</li><li>Проверка документов адвокатов и обеспечение безопасности платформы.</li></ul>
<h2>3. Передача третьим лицам</h2>
<p>Номер телефона клиента показывается только адвокату, принявшему заявку. Адвокаты, не принявшие заявку, контакты клиента не видят. Данные не передаются третьим лицам, кроме случаев, предусмотренных законом.</p>
<h2>4. Место и срок хранения</h2>
<p>Персональные данные граждан Узбекистана в соответствии с требованиями закона хранятся на серверах, расположенных на территории Республики Узбекистан. Данные хранятся до достижения цели обработки или до запроса пользователя на удаление.</p>
<h2>5. Права пользователя</h2>
<p>Вы вправе ознакомиться со своими данными, потребовать их исправления или удаления. Для этого напишите на [электронная почта].</p>
<h2>6. Изменения</h2>
<p>При обновлении политики новая редакция публикуется на этой странице.</p>`,
  },
  {
    slug: "ommaviy-oferta",
    titleUz: "Ommaviy oferta",
    titleRu: "Публичная оферта",
    contentUz: `<p>Ushbu ommaviy oferta [Kompaniya nomi] (keyingi oʻrinlarda — “Operator”) tomonidan advokatlarga {brand} platformasi orqali murojaatlar olish xizmatini koʻrsatish shartlarini belgilaydi.</p>
<h2>1. Shartnoma predmeti</h2>
<p>Operator advokatga platformada profil joylashtirish va hudud hamda yoʻnalish boʻyicha mijoz murojaatlarini olish imkoniyatini beradi. Advokat ushbu xizmat uchun obuna toʻlovini amalga oshiradi.</p>
<h2>2. Ofertani qabul qilish</h2>
<p>Advokat sifatida roʻyxatdan oʻtish va obuna toʻlovini amalga oshirish ushbu oferta shartlarini toʻliq qabul qilish (akseptlash) hisoblanadi.</p>
<h2>3. Narx va toʻlov tartibi</h2>
<p>Obuna narxi va muddati “Narxlar” sahifasida koʻrsatiladi. Toʻlov Payme, Click yoki bank oʻtkazmasi orqali amalga oshiriladi. Bepul sinov muddati Operator belgilagan shartlarda beriladi.</p>
<h2>4. Tomonlarning majburiyatlari</h2>
<ul><li>Advokat oʻzi haqida haqqoniy maʼlumot va amaldagi litsenziya nusxasini taqdim etadi.</li><li>Advokat mijoz maʼlumotlarini faqat murojaat boʻyicha yordam koʻrsatish uchun ishlatadi.</li><li>Operator platformaning uzluksiz ishlashini taʼminlashga harakat qiladi.</li></ul>
<h2>5. Javobgarlik</h2>
<p>Operator advokat tomonidan koʻrsatilgan yuridik xizmat sifati uchun javobgar emas. Advokat va mijoz oʻrtasidagi xizmat narxi va shartlari ular oʻrtasida bevosita kelishiladi.</p>
<h2>6. Rekvizitlar</h2>
<p>[Kompaniya nomi], STIR: [—], manzil: [—], h/r: [—], bank: [—], MFO: [—].</p>`,
    contentRu: `<p>Настоящая публичная оферта [Название компании] (далее — «Оператор») определяет условия оказания адвокатам услуги получения заявок через платформу {brand}.</p>
<h2>1. Предмет договора</h2>
<p>Оператор предоставляет адвокату возможность разместить профиль на платформе и получать заявки клиентов по региону и направлению. Адвокат оплачивает подписку за эту услугу.</p>
<h2>2. Акцепт оферты</h2>
<p>Регистрация в качестве адвоката и оплата подписки означают полное принятие (акцепт) условий настоящей оферты.</p>
<h2>3. Цена и порядок оплаты</h2>
<p>Стоимость и срок подписки указаны на странице «Цены». Оплата производится через Payme, Click или банковским переводом. Бесплатный пробный период предоставляется на условиях, установленных Оператором.</p>
<h2>4. Обязанности сторон</h2>
<ul><li>Адвокат предоставляет достоверные сведения о себе и копию действующей лицензии.</li><li>Адвокат использует данные клиента только для оказания помощи по заявке.</li><li>Оператор стремится обеспечить бесперебойную работу платформы.</li></ul>
<h2>5. Ответственность</h2>
<p>Оператор не несёт ответственности за качество юридических услуг, оказанных адвокатом. Стоимость и условия услуг согласуются между адвокатом и клиентом напрямую.</p>
<h2>6. Реквизиты</h2>
<p>[Название компании], ИНН: [—], адрес: [—], р/с: [—], банк: [—], МФО: [—].</p>`,
  },
];
