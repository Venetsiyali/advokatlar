// messages/uz.json → messages/uz-Cyrl.json avtomatik transliteratsiya.
// Ishga tushirish: npm run i18n:cyrl  (keyin kerak boʻlsa qoʻlda tahrirlang)
import { readFileSync, writeFileSync } from "node:fs";
import { latinToCyrillic } from "../src/lib/translit";

type Tree = { [k: string]: string | Tree };

// ICU tuzilmalari ({count}, plural kalitlari, #, <hl>) himoyalanadi, qolgan matn transliteratsiya qilinadi
const PROTECT = /(\{\w+\}|\{\w+,\s*plural,|(?:one|few|many|other)\s*\{|=\d+\s*\{|<\/?\w+>|#)/g;

function convertIcu(value: string): string {
  return value
    .split(PROTECT)
    .map((part, i) => (i % 2 === 1 ? part : latinToCyrillic(part)))
    .join("");
}

function walk(node: Tree): Tree {
  const out: Tree = {};
  for (const [k, v] of Object.entries(node)) {
    out[k] = typeof v === "string" ? convertIcu(v) : walk(v);
  }
  return out;
}

const src = JSON.parse(readFileSync("messages/uz.json", "utf8")) as Tree;
writeFileSync("messages/uz-Cyrl.json", JSON.stringify(walk(src), null, 2) + "\n", "utf8");
console.log("messages/uz-Cyrl.json yangilandi");
