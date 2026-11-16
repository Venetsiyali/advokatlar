// 14 ta hudud va ularning tumanlari/shaharlari (lotin yozuvida; kirill varianti seed paytida generatsiya qilinadi)
export type RegionSeed = {
  slug: string;
  nameUz: string;
  nameRu: string;
  districts: string[];
};

export const REGIONS: RegionSeed[] = [
  {
    slug: "toshkent-shahri",
    nameUz: "Toshkent shahri",
    nameRu: "г. Ташкент",
    districts: ["Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulugʻbek", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yashnobod", "Yunusobod", "Yangihayot"],
  },
  {
    slug: "toshkent-viloyati",
    nameUz: "Toshkent viloyati",
    nameRu: "Ташкентская область",
    districts: ["Angren sh.", "Bekobod", "Boʻka", "Boʻstonliq", "Chinoz", "Chirchiq sh.", "Nurafshon sh.", "Ohangaron", "Olmaliq sh.", "Oqqoʻrgʻon", "Oʻrtachirchiq", "Parkent", "Piskent", "Qibray", "Quyichirchiq", "Toshkent tumani", "Yangiyoʻl", "Yuqorichirchiq", "Zangiota"],
  },
  {
    slug: "andijon",
    nameUz: "Andijon viloyati",
    nameRu: "Андижанская область",
    districts: ["Andijon sh.", "Andijon tumani", "Asaka", "Baliqchi", "Boʻston", "Buloqboshi", "Izboskan", "Jalaquduq", "Marhamat", "Oltinkoʻl", "Paxtaobod", "Qoʻrgʻontepa", "Shahrixon", "Ulugʻnor", "Xonobod sh.", "Xoʻjaobod"],
  },
  {
    slug: "fargona",
    nameUz: "Fargʻona viloyati",
    nameRu: "Ферганская область",
    districts: ["Fargʻona sh.", "Margʻilon sh.", "Qoʻqon sh.", "Quvasoy sh.", "Bagʻdod", "Beshariq", "Buvayda", "Dangʻara", "Fargʻona tumani", "Furqat", "Oltiariq", "Qoʻshtepa", "Quva", "Rishton", "Soʻx", "Toshloq", "Uchkoʻprik", "Oʻzbekiston", "Yozyovon"],
  },
  {
    slug: "namangan",
    nameUz: "Namangan viloyati",
    nameRu: "Наманганская область",
    districts: ["Namangan sh.", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop", "Toʻraqoʻrgʻon", "Uchqoʻrgʻon", "Uychi", "Yangiqoʻrgʻon"],
  },
  {
    slug: "samarqand",
    nameUz: "Samarqand viloyati",
    nameRu: "Самаркандская область",
    districts: ["Samarqand sh.", "Kattaqoʻrgʻon sh.", "Bulungʻur", "Ishtixon", "Jomboy", "Kattaqoʻrgʻon tumani", "Narpay", "Nurobod", "Oqdaryo", "Paxtachi", "Payariq", "Pastdargʻom", "Qoʻshrabot", "Samarqand tumani", "Toyloq", "Urgut"],
  },
  {
    slug: "buxoro",
    nameUz: "Buxoro viloyati",
    nameRu: "Бухарская область",
    districts: ["Buxoro sh.", "Kogon sh.", "Buxoro tumani", "Gʻijduvon", "Jondor", "Kogon tumani", "Olot", "Peshku", "Qorakoʻl", "Qorovulbozor", "Romitan", "Shofirkon", "Vobkent"],
  },
  {
    slug: "navoiy",
    nameUz: "Navoiy viloyati",
    nameRu: "Навоийская область",
    districts: ["Navoiy sh.", "Zarafshon sh.", "Karmana", "Konimex", "Navbahor", "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi"],
  },
  {
    slug: "qashqadaryo",
    nameUz: "Qashqadaryo viloyati",
    nameRu: "Кашкадарьинская область",
    districts: ["Qarshi sh.", "Shahrisabz sh.", "Chiroqchi", "Dehqonobod", "Gʻuzor", "Kasbi", "Kitob", "Koson", "Koʻkdala", "Mirishkor", "Muborak", "Nishon", "Qamashi", "Qarshi tumani", "Shahrisabz tumani", "Yakkabogʻ"],
  },
  {
    slug: "surxondaryo",
    nameUz: "Surxondaryo viloyati",
    nameRu: "Сурхандарьинская область",
    districts: ["Termiz sh.", "Angor", "Bandixon", "Boysun", "Denov", "Jarqoʻrgʻon", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqoʻrgʻon", "Sariosiyo", "Sherobod", "Shoʻrchi", "Termiz tumani", "Uzun"],
  },
  {
    slug: "jizzax",
    nameUz: "Jizzax viloyati",
    nameRu: "Джизакская область",
    districts: ["Jizzax sh.", "Arnasoy", "Baxmal", "Doʻstlik", "Forish", "Gʻallaorol", "Mirzachoʻl", "Paxtakor", "Sharof Rashidov", "Yangiobod", "Zafarobod", "Zarbdor", "Zomin"],
  },
  {
    slug: "sirdaryo",
    nameUz: "Sirdaryo viloyati",
    nameRu: "Сырдарьинская область",
    districts: ["Guliston sh.", "Shirin sh.", "Yangiyer sh.", "Boyovut", "Guliston tumani", "Mirzaobod", "Oqoltin", "Sardoba", "Sayxunobod", "Sirdaryo tumani", "Xovos"],
  },
  {
    slug: "xorazm",
    nameUz: "Xorazm viloyati",
    nameRu: "Хорезмская область",
    districts: ["Urganch sh.", "Xiva sh.", "Bogʻot", "Gurlan", "Hazorasp", "Qoʻshkoʻpir", "Shovot", "Tuproqqalʼa", "Urganch tumani", "Xiva tumani", "Xonqa", "Yangiariq", "Yangibozor"],
  },
  {
    slug: "qoraqalpogiston",
    nameUz: "Qoraqalpogʻiston Respublikasi",
    nameRu: "Республика Каракалпакстан",
    districts: ["Nukus sh.", "Amudaryo", "Beruniy", "Boʻzatov", "Chimboy", "Ellikqalʼa", "Kegeyli", "Moʻynoq", "Nukus tumani", "Qanlikoʻl", "Qoraoʻzak", "Qoʻngʻirot", "Shumanay", "Taxiatosh", "Taxtakoʻpir", "Toʻrtkoʻl", "Xoʻjayli"],
  },
];

export const SPECIALIZATIONS = [
  { slug: "jinoiy", nameUz: "Jinoiy ishlar", nameRu: "Уголовные дела", icon: "gavel" },
  { slug: "fuqarolik", nameUz: "Fuqarolik ishlari", nameRu: "Гражданские дела", icon: "scale" },
  { slug: "iqtisodiy", nameUz: "Iqtisodiy nizolar", nameRu: "Экономические споры", icon: "briefcase" },
  { slug: "mamuriy", nameUz: "Maʼmuriy ishlar", nameRu: "Административные дела", icon: "landmark" },
  { slug: "oilaviy", nameUz: "Oilaviy nizolar", nameRu: "Семейные споры", icon: "users" },
  { slug: "mehnat", nameUz: "Mehnat nizolari", nameRu: "Трудовые споры", icon: "hard-hat" },
  { slug: "uy-joy", nameUz: "Uy-joy va mulk", nameRu: "Жильё и недвижимость", icon: "home" },
  { slug: "meros", nameUz: "Meros ishlari", nameRu: "Наследственные дела", icon: "scroll" },
  { slug: "soliq", nameUz: "Soliq nizolari", nameRu: "Налоговые споры", icon: "receipt" },
  { slug: "bank-kredit", nameUz: "Bank va kredit", nameRu: "Банки и кредиты", icon: "landmark" },
  { slug: "yer", nameUz: "Yer nizolari", nameRu: "Земельные споры", icon: "map" },
  { slug: "migratsiya", nameUz: "Migratsiya va fuqarolik", nameRu: "Миграция и гражданство", icon: "plane" },
];
