// Oʻzbek lotin → kirill transliteratsiyasi (seed va tarjima fayllarini generatsiya qilish uchun)
const MULTI: [RegExp, string][] = [
  [/o[ʻ'‘`ʼ’]/g, "ў"], [/O[ʻ'‘`ʼ’]/g, "Ў"],
  [/g[ʻ'‘`ʼ’]/g, "ғ"], [/G[ʻ'‘`ʼ’]/g, "Ғ"],
  [/sh/g, "ш"], [/Sh/g, "Ш"], [/SH/g, "Ш"],
  [/ch/g, "ч"], [/Ch/g, "Ч"], [/CH/g, "Ч"],
  [/yo/g, "ё"], [/Yo/g, "Ё"],
  [/yu/g, "ю"], [/Yu/g, "Ю"],
  [/ya/g, "я"], [/Ya/g, "Я"],
  [/ye/g, "е"], [/Ye/g, "Е"],
];

const SINGLE: Record<string, string> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к",
  l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у",
  v: "в", x: "х", y: "й", z: "з", c: "с", w: "в",
};

export function latinToCyrillic(input: string): string {
  // ICU / next-intl o'zgaruvchilari ({count}, {region}) va HTML teglari tegilmasin
  return input
    .split(/(\{[^}]*\}|<[^>]+>|&#?\w+;|https?:\/\/[^\s<"]+)/g)
    .map((part, i) => (i % 2 === 1 ? part : convert(part)))
    .join("");
}

function convert(text: string): string {
  let s = text;
  // so'z boshidagi "e" → "э"
  s = s.replace(/(^|[\s«"(—-])e/g, "$1э").replace(/(^|[\s«"(—-])E/g, "$1Э");
  for (const [re, rep] of MULTI) s = s.replace(re, rep);
  s = s.replace(/ʼ/g, "ъ");
  let out = "";
  for (const ch of s) {
    const lower = ch.toLowerCase();
    const mapped = SINGLE[lower];
    if (!mapped) {
      out += ch;
      continue;
    }
    out += ch === lower ? mapped : mapped.toUpperCase();
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ʻ'‘`ʼ’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Brend nomi kabi soʻzlarni oʻzgartirmasdan transliteratsiya qilish */
export function latinToCyrillicKeep(input: string, keep: string[]): string {
  let s = input;
  keep.forEach((w, i) => w && (s = s.split(w).join(`{keep${i}}`)));
  let out = latinToCyrillic(s);
  keep.forEach((w, i) => w && (out = out.split(`{keep${i}}`).join(w)));
  return out;
}
