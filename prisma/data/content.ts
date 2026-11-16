// Mavzu sahifalari va test maqolalar. Matnlar umumiy maʼlumot uchun — huquqiy maslahat oʻrnini bosmaydi.
type Topic = {
  slug: string;
  title: string;
  titleRu: string;
  spec: string;
  icon: string;
  summary: string;
  content: string;
};

const block = (intro: string, points: string[], outro: string) =>
  `<p>${intro}</p><h2>Advokat qanday yordam beradi</h2><ul>${points
    .map((p) => `<li>${p}</li>`)
    .join("")}</ul><p>${outro}</p>`;

export const TOPICS: Topic[] = [
  {
    slug: "ajrashish",
    title: "Ajrashish",
    titleRu: "Развод",
    spec: "oilaviy",
    icon: "heart-crack",
    summary: "Nikohni bekor qilish, mol-mulk boʻlinishi va bolalar masalasi.",
    content: block(
      "Ajrashish jarayoni nafaqat hissiy, balki huquqiy jihatdan ham murakkab boʻlishi mumkin: umumiy mol-mulk, bolalarning yashash joyi va aliment masalalari bir vaqtda hal qilinadi.",
      ["Da'vo arizasini tayyorlash va sudga topshirish", "Mol-mulkni boʻlish boʻyicha kelishuv loyihasini tuzish", "Bolalar bilan bogʻliq masalalarda manfaatingizni himoya qilish"],
      "Murojaat qoldiring — oilaviy nizolar boʻyicha tajribali advokat siz bilan bogʻlanadi.",
    ),
  },
  {
    slug: "aliment",
    title: "Aliment undirish",
    titleRu: "Взыскание алиментов",
    spec: "oilaviy",
    icon: "baby",
    summary: "Bolalar va muhtoj oila aʼzolari uchun aliment tayinlash va undirish.",
    content: block(
      "Aliment miqdorini belgilash, uni undirish yoki oʻzgartirish boʻyicha savollar eng koʻp uchraydigan oilaviy masalalardan biridir.",
      ["Aliment miqdorini hisoblash va asoslash", "Sud buyrugʻi yoki da'vo orqali undirish", "Qarzdorlik yuzaga kelganda ijro jarayonida yordam"],
      "Vaziyatingizni qisqacha yozing — mos advokat taklif qilinadi.",
    ),
  },
  {
    slug: "meros",
    title: "Meros masalalari",
    titleRu: "Наследство",
    spec: "meros",
    icon: "scroll",
    summary: "Merosni rasmiylashtirish, vasiyatnoma va merosxoʻrlar oʻrtasidagi nizolar.",
    content: block(
      "Meros ochilgandan keyin muddatlarni oʻtkazib yubormaslik va hujjatlarni toʻgʻri rasmiylashtirish muhim.",
      ["Merosni qabul qilish tartibini tushuntirish", "Notarius va sud bilan ishlashda vakillik", "Merosxoʻrlar oʻrtasidagi nizolarni hal qilish"],
      "Meros ishlari boʻyicha tajribali advokat bilan bogʻlaning.",
    ),
  },
  {
    slug: "uy-joy",
    title: "Uy-joy nizolari",
    titleRu: "Жилищные споры",
    spec: "uy-joy",
    icon: "home",
    summary: "Oldi-sotdi, ijara, roʻyxatdan oʻtkazish va boshqa koʻchmas mulk masalalari.",
    content: block(
      "Koʻchmas mulk bilan bogʻliq bitimlar katta mablagʻ talab qiladi, shuning uchun har bir hujjat puxta tekshirilishi kerak.",
      ["Bitim hujjatlarini tekshirish", "Ijara va oldi-sotdi nizolarida vakillik", "Mulk huquqini tan olish boʻyicha sudda himoya"],
      "Uy-joy masalasida yordam kerakmi? Murojaat qoldiring.",
    ),
  },
  {
    slug: "mehnat-nizosi",
    title: "Mehnat nizolari",
    titleRu: "Трудовые споры",
    spec: "mehnat",
    icon: "hard-hat",
    summary: "Ishdan nohaq boʻshatish, ish haqi toʻlanmasligi va mehnat shartnomasi.",
    content: block(
      "Ish beruvchi bilan kelishmovchilik yuzaga kelganda huquqlaringizni bilish va muddatlarga rioya qilish muhim.",
      ["Ishga tiklash boʻyicha da'vo tayyorlash", "Toʻlanmagan ish haqini undirish", "Mehnat shartnomasini tahlil qilish"],
      "Mehnat huquqi boʻyicha advokat bilan bogʻlaning.",
    ),
  },
  {
    slug: "qarz-undirish",
    title: "Qarz undirish",
    titleRu: "Взыскание долга",
    spec: "fuqarolik",
    icon: "hand-coins",
    summary: "Tilxat, shartnoma yoki boshqa dalillar asosida qarzni qaytarish.",
    content: block(
      "Qarz qaytarilmagan holatlarda dalillarni toʻplash va toʻgʻri yoʻl tanlash natijaga bevosita taʼsir qiladi.",
      ["Dalillarni baholash va talabnoma yuborish", "Sudga da'vo kiritish", "Ijro hujjati boʻyicha undirishda koʻmak"],
      "Qarzingizni qaytarishda yordam kerak boʻlsa — murojaat qiling.",
    ),
  },
  {
    slug: "yth",
    title: "YTH (yoʻl-transport hodisasi)",
    titleRu: "ДТП",
    spec: "mamuriy",
    icon: "car",
    summary: "YTH dan keyingi zarar undirish, sugʻurta va maʼmuriy javobgarlik.",
    content: block(
      "Yoʻl-transport hodisasidan keyin birinchi qadamlar keyingi jarayonga katta taʼsir koʻrsatadi.",
      ["Hodisa materiallarini tahlil qilish", "Sugʻurta tovonini olishda yordam", "Maʼmuriy yoki jinoiy ishda himoya"],
      "YTH boʻyicha tajribali advokat bilan bogʻlaning.",
    ),
  },
  {
    slug: "firibgarlik",
    title: "Firibgarlik",
    titleRu: "Мошенничество",
    spec: "jinoiy",
    icon: "shield-alert",
    summary: "Firibgarlik qurboni boʻlganlar va ayblanuvchilar uchun huquqiy yordam.",
    content: block(
      "Firibgarlik bilan bogʻliq ishlarda tezkor harakat qilish va dalillarni saqlab qolish juda muhim.",
      ["Arizani toʻgʻri rasmiylashtirish", "Tergov jarayonida vakillik", "Sudda himoya yoki jabrlanuvchi manfaatini ifodalash"],
      "Jinoiy ishlar boʻyicha advokatga murojaat qiling.",
    ),
  },
  {
    slug: "bank-kredit",
    title: "Bank va kredit nizolari",
    titleRu: "Споры с банками",
    spec: "bank-kredit",
    icon: "landmark",
    summary: "Kredit shartnomasi, penya, garov va bank bilan kelishmovchiliklar.",
    content: block(
      "Kredit boʻyicha muammolar paydo boʻlganda bank bilan muzokara qilish va shartnoma shartlarini tahlil qilish kerak boʻladi.",
      ["Kredit shartnomasini tahlil qilish", "Qayta tuzish boʻyicha muzokaralarda koʻmak", "Sudda bank da'vosiga qarshi himoya"],
      "Bank va kredit masalalari boʻyicha advokat toping.",
    ),
  },
  {
    slug: "yer-nizolari",
    title: "Yer nizolari",
    titleRu: "Земельные споры",
    spec: "yer",
    icon: "map",
    summary: "Yer uchastkasi, chegaralar va yerdan foydalanish huquqi boʻyicha nizolar.",
    content: block(
      "Yer uchastkasi bilan bogʻliq nizolarda hujjatlar tarixini oʻrganish va vakolatli organlar bilan ishlash talab etiladi.",
      ["Hujjatlarni tekshirish", "Davlat organlariga murojaatlar tayyorlash", "Sudda vakillik"],
      "Yer nizolari boʻyicha advokat bilan bogʻlaning.",
    ),
  },
  {
    slug: "apellyatsiya",
    title: "Apellyatsiya va kassatsiya",
    titleRu: "Апелляция и кассация",
    spec: "fuqarolik",
    icon: "scale",
    summary: "Sud qaroridan norozi boʻlsangiz — yuqori instansiyaga shikoyat.",
    content: block(
      "Sud qaroriga shikoyat qilish muddatlari cheklangan, shuning uchun imkon qadar tezroq harakat qilish lozim.",
      ["Sud qarorini tahlil qilish", "Apellyatsiya yoki kassatsiya shikoyatini tayyorlash", "Yuqori instansiyada vakillik"],
      "Shikoyat tayyorlash uchun advokatga murojaat qiling.",
    ),
  },
];

export const ARTICLES = [
  {
    slug: "advokatni-qanday-tanlash-kerak",
    title: "Advokatni qanday tanlash kerak: 5 ta amaliy maslahat",
    excerpt: "Toʻgʻri advokatni tanlash ishingiz natijasiga bevosita taʼsir qiladi. Nimalarga eʼtibor berish kerak?",
    content:
      "<p>Advokat tanlashda avvalo uning ixtisosligiga qarang: oilaviy nizo bilan jinoiy ish turli bilim va tajriba talab qiladi.</p><h2>1. Litsenziyani tekshiring</h2><p>Platformamizdagi “Tasdiqlangan” belgisi advokat litsenziyasi tekshirilganini bildiradi.</p><h2>2. Tajriba va izohlar</h2><p>Oʻxshash ishlarni yuritgan mutaxassis bilan ishlash osonroq.</p><h2>3. Narxni oldindan kelishing</h2><p>Xizmat hajmi va toʻlov tartibini yozma ravishda kelishib oling.</p><h2>4. Aloqa qulayligi</h2><p>Advokat siz bilan qaysi kanal orqali va qanchalik tez bogʻlanishini aniqlang.</p><h2>5. Maxfiylik</h2><p>Advokat siri qonun bilan himoyalangan — vaziyatingizni toʻliq aytib berishdan qoʻrqmang.</p>",
  },
  {
    slug: "aliment-miqdori-qanday-belgilanadi",
    title: "Aliment miqdori qanday belgilanadi?",
    excerpt: "Aliment tayinlashning asosiy tamoyillari va amalda koʻp beriladigan savollar.",
    content:
      "<p>Aliment miqdori odatda daromadning maʼlum ulushi yoki qatʼiy summa koʻrinishida belgilanadi. Aniq miqdor oilaviy vaziyat va dalillarga bogʻliq.</p><h2>Qayerdan boshlash kerak?</h2><p>Avvalo hujjatlarni (tugʻilganlik haqidagi guvohnoma, daromad maʼlumotlari) tayyorlang va advokat bilan maslahatlashing.</p>",
  },
  {
    slug: "ishdan-nohaq-boshatilsangiz",
    title: "Ishdan nohaq boʻshatilsangiz nima qilish kerak?",
    excerpt: "Mehnat huquqlaringizni himoya qilish uchun dastlabki qadamlar.",
    content:
      "<p>Boʻshatish haqidagi buyruq nusxasini oling va unga qanday asos koʻrsatilganini tekshiring.</p><h2>Muddatlarga eʼtibor bering</h2><p>Mehnat nizolari boʻyicha murojaat qilish muddatlari qisqa boʻlishi mumkin, shuning uchun kechiktirmang.</p>",
  },
  {
    slug: "yth-dan-keyin-birinchi-qadamlar",
    title: "YTH dan keyin birinchi qadamlar",
    excerpt: "Yoʻl-transport hodisasidan soʻng huquqlaringizni saqlab qolish uchun nimalar qilish kerak.",
    content:
      "<p>Hodisa joyini suratga oling, guvohlarning kontaktlarini yozib oling va tegishli xizmatlarni chaqiring.</p><h2>Hujjatlar</h2><p>Bayonnoma va sugʻurta hujjatlarining nusxalarini saqlang — ular keyinchalik tovon olishda kerak boʻladi.</p>",
  },
  {
    slug: "meros-qabul-qilish-tartibi",
    title: "Merosni qabul qilish tartibi: qisqa qoʻllanma",
    excerpt: "Meros ochilganidan keyin qanday hujjatlar va qaysi muddatlar muhim?",
    content:
      "<p>Merosni qabul qilish uchun notariusga ariza bilan murojaat qilinadi. Muddatlarni oʻtkazib yubormaslik muhim.</p><h2>Nizolar boʻlsa</h2><p>Merosxoʻrlar oʻrtasida kelishmovchilik boʻlsa, masala sud orqali hal qilinishi mumkin.</p>",
  },
];
