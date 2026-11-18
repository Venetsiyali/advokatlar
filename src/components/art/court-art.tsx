/**
 * Sud mavzusidagi oʻz illyustratsiyalarimiz (SVG): sud binosi, Themis tarozisi, sudya bolgʻachasi,
 * qonun kitoblari va muhr. Vektor — har qanday ekranda tiniq, bir necha KB, tashqi rasm yuklanmaydi.
 * Animatsiyalar globals.css dagi .art-* klasslarida (faqat transform/opacity, "kamroq harakat"da oʻchadi).
 *
 * `id` — gradient identifikatorlari uchun prefiks: bir sahifada bir nechta rasm boʻlsa ham toʻqnashmaydi.
 */

type ArtProps = { id: string; className?: string; animated?: boolean };

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#e9c46a" stopOpacity="0.55" />
        <stop offset="0.55" stopColor="#c49a3c" stopOpacity="0.16" />
        <stop offset="1" stopColor="#c49a3c" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fdfaf2" />
        <stop offset="1" stopColor="#ddd2ba" />
      </linearGradient>
      <linearGradient id={`${id}-col`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c9bc9f" />
        <stop offset="0.42" stopColor="#fffbf2" />
        <stop offset="0.7" stopColor="#ece3cf" />
        <stop offset="1" stopColor="#bfb194" />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6e3ae" />
        <stop offset="0.45" stopColor="#d6b25c" />
        <stop offset="1" stopColor="#9c7526" />
      </linearGradient>
      <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a5a33" />
        <stop offset="0.5" stopColor="#7a4021" />
        <stop offset="1" stopColor="#4e2614" />
      </linearGradient>
      <linearGradient id={`${id}-woodtop`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8b4f2c" />
        <stop offset="0.5" stopColor="#b06f43" />
        <stop offset="1" stopColor="#7a4021" />
      </linearGradient>
    </defs>
  );
}

/** Ustunli sud binosi (markazi x=cx, zinapoyalar pastki chizigʻi y=base) */
function Courthouse({ id, cx = 300, base = 442 }: { id: string; cx?: number; base?: number }) {
  const cols = [-125, -75, -25, 25, 75, 125];
  const top = base - 254; // karniz
  return (
    <g>
      <ellipse cx={cx} cy={base + 10} rx="240" ry="10" fill="#000" opacity="0.28" />
      {/* Orqa devor va eshik */}
      <rect x={cx - 150} y={top + 32} width="300" height="190" fill="#e6dcc6" />
      <path d={`M${cx - 22} ${base - 36} v-70 a22 22 0 0 1 44 0 v70 z`} fill="#163a60" opacity="0.85" />
      {/* Frontón */}
      <path d={`M${cx - 160} ${top} L${cx} ${top - 86} L${cx + 160} ${top} Z`} fill={`url(#${id}-stone)`} />
      <path d={`M${cx - 128} ${top - 7} L${cx} ${top - 70} L${cx + 128} ${top - 7} Z`} fill="none" stroke="#c49a3c" strokeWidth="2" opacity="0.75" />
      <circle cx={cx} cy={top - 30} r="15" fill={`url(#${id}-gold)`} />
      <path d={`M${cx} ${top - 40} v18 M${cx - 8} ${top - 35} h16 M${cx - 8} ${top - 35} l-3 7 h6 z M${cx + 8} ${top - 35} l-3 7 h6 z`} stroke="#102c4a" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* Karniz va friz */}
      <rect x={cx - 166} y={top - 2} width="332" height="11" rx="2" fill="#f8f2e4" />
      <rect x={cx - 152} y={top + 9} width="304" height="23" fill={`url(#${id}-stone)`} />
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={cx - 146 + i * 20} y={top + 23} width="10" height="5" fill="#d3c7aa" />
      ))}
      {/* Ustunlar */}
      {cols.map((dx) => {
        const x = cx + dx;
        return (
          <g key={dx}>
            <rect x={x - 17} y={top + 32} width="34" height="8" rx="1.5" fill="#f4ecdc" />
            <rect x={x - 12} y={top + 40} width="24" height="168" fill={`url(#${id}-col)`} />
            <path d={`M${x - 6} ${top + 44} V${top + 204} M${x} ${top + 44} V${top + 204} M${x + 6} ${top + 44} V${top + 204}`} stroke="#7a6438" strokeOpacity="0.16" strokeWidth="1.2" />
            <rect x={x - 16} y={top + 208} width="32" height="8" rx="1.5" fill="#f1e8d6" />
          </g>
        );
      })}
      {/* Zinapoyalar */}
      <rect x={cx - 160} y={base - 38} width="320" height="12" fill="#f3ebda" />
      <rect x={cx - 175} y={base - 26} width="350" height="13" fill="#e4d9c1" />
      <rect x={cx - 190} y={base - 13} width="380" height="13" fill="#d4c7aa" />
    </g>
  );
}

/** Themis tarozisi: ustun tepasidagi tayanch (px, py) atrofida tebranadi */
function Scales({ id, px, py, w = 160, animated }: { id: string; px: number; py: number; w?: number; animated?: boolean }) {
  const half = w / 2;
  const pan = (x: number) => (
    <g className={animated ? "art-counter-sway" : undefined}>
      <path d={`M${x} ${py + 4} L${x - 24} ${py + 72} M${x} ${py + 4} L${x + 24} ${py + 72}`} stroke="#d6b25c" strokeWidth="1.6" />
      <path d={`M${x - 30} ${py + 72} Q${x} ${py + 98} ${x + 30} ${py + 72} Z`} fill={`url(#${id}-gold)`} />
      <ellipse cx={x} cy={py + 72} rx="30" ry="4" fill="#f6e3ae" opacity="0.9" />
    </g>
  );
  return (
    <g>
      {/* Ustun va asos */}
      <rect x={px - 3.5} y={py} width="7" height="160" rx="3" fill={`url(#${id}-gold)`} />
      <path d={`M${px - 34} ${py + 172} L${px + 34} ${py + 172} L${px + 22} ${py + 158} L${px - 22} ${py + 158} Z`} fill={`url(#${id}-gold)`} />
      <rect x={px - 40} y={py + 172} width="80" height="7" rx="3" fill="#9c7526" />
      <g className={animated ? "art-sway" : undefined} style={{ transformOrigin: `${px}px ${py}px` }}>
        <rect x={px - half} y={py - 3} width={w} height="6" rx="3" fill={`url(#${id}-gold)`} />
        <circle cx={px - half} cy={py} r="5" fill="#f6e3ae" />
        <circle cx={px + half} cy={py} r="5" fill="#f6e3ae" />
        {pan(px - half)}
        {pan(px + half)}
      </g>
      <circle cx={px} cy={py - 10} r="9" fill={`url(#${id}-gold)`} />
      <circle cx={px} cy={py - 10} r="3.5" fill="#fff7dc" opacity="0.8" />
    </g>
  );
}

/** Qonun kitoblari taxlami (chap-pastki burchak x, pastki chiziq base) */
function Books({ x, base }: { x: number; base: number }) {
  const books = [
    { dx: 0, w: 168, h: 28, c: "#6e2632" },
    { dx: 12, w: 146, h: 25, c: "#1f4d43" },
    { dx: 4, w: 158, h: 23, c: "#5a3a1e" },
  ];
  let y = base;
  return (
    <g>
      <ellipse cx={x + 84} cy={base + 4} rx="96" ry="7" fill="#000" opacity="0.3" />
      {books.map((b, i) => {
        y -= b.h;
        return (
          <g key={i}>
            <rect x={x + b.dx} y={y} width={b.w} height={b.h} rx="3" fill={b.c} />
            <rect x={x + b.dx} y={y} width={b.w} height="3" rx="1.5" fill="#fff" opacity="0.12" />
            <rect x={x + b.dx + 14} y={y} width="3" height={b.h} fill="#d6b25c" />
            <rect x={x + b.dx + b.w - 17} y={y} width="3" height={b.h} fill="#d6b25c" />
            <rect x={x + b.dx + b.w / 2 - 26} y={y + b.h / 2 - 5} width="52" height="10" rx="1.5" fill="#d6b25c" opacity="0.85" />
          </g>
        );
      })}
    </g>
  );
}

/** Sudya bolgʻachasi va zarb taglik (taglik markazi cx, yuqori yuzasi y) */
function Gavel({ id, cx, y, animated }: { id: string; cx: number; y: number; animated?: boolean }) {
  // Bolgʻacha boshi taglik ustida; dastasi yuqori-oʻngga. Tebranish — dasta uchi atrofida.
  const hx = cx - 5;
  const hy = y - 30;
  const a = (-38 * Math.PI) / 180;
  const pivot = { x: hx + 130 * Math.cos(a), y: hy + 130 * Math.sin(a) };
  return (
    <g>
      <ellipse cx={cx} cy={y + 22} rx="78" ry="9" fill="#000" opacity="0.3" />
      <ellipse cx={cx} cy={y + 16} rx="62" ry="12" fill="#4e2614" />
      <rect x={cx - 62} y={y} width="124" height="16" fill={`url(#${id}-wood)`} />
      <rect x={cx - 62} y={y + 6} width="124" height="3" fill="#d6b25c" opacity="0.9" />
      <ellipse cx={cx} cy={y} rx="62" ry="12" fill={`url(#${id}-woodtop)`} />
      <g className={animated ? "art-gavel" : undefined} style={{ transformOrigin: `${pivot.x}px ${pivot.y}px` }}>
        <g transform={`translate(${hx} ${hy}) rotate(-38)`}>
          <rect x="0" y="-5" width="130" height="10" rx="5" fill={`url(#${id}-wood)`} />
          <circle cx="130" cy="0" r="7.5" fill="#7a4021" />
          <rect x="-21" y="-36" width="42" height="72" rx="9" fill={`url(#${id}-wood)`} />
          <rect x="-21" y="-26" width="42" height="5" fill="#d6b25c" />
          <rect x="-21" y="21" width="42" height="5" fill="#d6b25c" />
          <rect x="-15" y="-34" width="8" height="68" rx="4" fill="#fff" opacity="0.12" />
        </g>
      </g>
    </g>
  );
}

/** Bosh sahifa: sud binosi fonida tarozi, kitoblar va bolgʻacha */
export function CourtHeroArt({ id, className, animated = true }: ArtProps) {
  const sparks = [
    { x: 120, y: 420, d: "0s" },
    { x: 230, y: 440, d: "2.2s" },
    { x: 360, y: 430, d: "4.1s" },
    { x: 470, y: 410, d: "1.3s" },
    { x: 300, y: 380, d: "6s" },
    { x: 60, y: 360, d: "3.3s" },
  ];
  return (
    <svg viewBox="0 0 560 500" className={className} role="img" aria-hidden="true">
      <Defs id={id} />
      <circle cx="300" cy="240" r="240" fill={`url(#${id}-glow)`} className={animated ? "art-glow" : undefined} />
      {animated &&
        sparks.map((s) => <circle key={s.x} cx={s.x} cy={s.y} r="2.2" fill="#f0d48c" className="art-spark" style={{ animationDelay: s.d }} />)}
      <Courthouse id={id} cx={318} base={446} />
      <Books x={22} base={486} />
      <Scales id={id} px={106} py={236} w={150} animated={animated} />
      <Gavel id={id} cx={462} y={458} animated={animated} />
    </svg>
  );
}

/** Qogʻoz va muhr (shartnoma, hujjat) */
function Seal({ id, cx, cy }: { id: string; cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 46} y={cy - 56} width="92" height="112" rx="5" fill="#fbf7ec" transform={`rotate(-6 ${cx} ${cy})`} />
      <g transform={`rotate(-6 ${cx} ${cy})`} stroke="#c9bc9f" strokeWidth="3" strokeLinecap="round">
        <path d={`M${cx - 32} ${cy - 36} h64 M${cx - 32} ${cy - 22} h64 M${cx - 32} ${cy - 8} h48 M${cx - 32} ${cy + 6} h56`} />
      </g>
      <circle cx={cx + 22} cy={cy + 30} r="20" fill={`url(#${id}-gold)`} />
      <circle cx={cx + 22} cy={cy + 30} r="13" fill="none" stroke="#9c7526" strokeWidth="1.5" />
      <path d={`M${cx + 12} ${cy + 48} l-6 20 l10 -6 l6 8 l3 -20 Z`} fill="#8a2b36" />
    </g>
  );
}

export type Motif = "scales" | "gavel" | "courthouse" | "books" | "seal";
const MOTIFS: Motif[] = ["scales", "gavel", "courthouse", "books", "seal"];

// Mavzuga mos predmet: shartnoma/vasiyat — muhrli hujjat, jinoyat — bolgʻacha, oila — tarozi va h.k.
const KEYWORDS: [RegExp, Motif][] = [
  [/shartnoma|ijara|vasiyat|tilxat|dogovor|arend|zaveshch|raspisk/, "seal"],
  [/ushlab|firib|zaderzh|moshenn|jinoyat|ugolov/, "gavel"],
  [/ajrash|bola|razvod|rebenok|aliment|oila|semej/, "scales"],
  [/qarz|kredit|ish-haqi|dolg|zarplat|mehnat|trud/, "books"],
  [/advokat|sud|narx|stoit/, "courthouse"],
];

/** Matndan barqaror motif tanlash (maqola muqovalari har xil, lekin har safar bir xil boʻladi) */
export function motifFor(seed: string): Motif {
  const hit = KEYWORDS.find(([re]) => re.test(seed));
  if (hit) return hit[1];
  let h = 0x811c9dc5; // FNV-1a
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return MOTIFS[h % MOTIFS.length];
}

/** Bitta sud predmeti — maqola muqovalari, boʻsh holatlar va boʻlim bezaklari uchun (viewBox 320×200) */
export function MotifArt({ id, motif, className, animated = false }: ArtProps & { motif: Motif }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-hidden="true">
      <Defs id={id} />
      <circle cx="160" cy="100" r="110" fill={`url(#${id}-glow)`} />
      {motif === "scales" && (
        <g transform="translate(70 4) scale(0.95)">
          <Scales id={id} px={95} py={30} w={150} animated={animated} />
        </g>
      )}
      {motif === "gavel" && (
        <g transform="translate(-150 -252)">
          <Gavel id={id} cx={300} y={400} animated={animated} />
        </g>
      )}
      {motif === "courthouse" && (
        <g transform="translate(64 -44) scale(0.52)">
          <Courthouse id={id} cx={185} base={446} />
        </g>
      )}
      {motif === "books" && (
        <g transform="translate(58 36) scale(1.05)">
          <Books x={10} base={140} />
          <g transform="translate(118 -6) scale(0.42)">
            <Scales id={id} px={60} py={130} w={110} />
          </g>
        </g>
      )}
      {motif === "seal" && <Seal id={id} cx={160} cy={98} />}
    </svg>
  );
}

/** Maqola muqovasi (rasm yuklanmagan boʻlsa): toʻq koʻk fon, ustun naqshi va sud predmeti */
export function ArticleCover({ seed, className }: { seed: string; className?: string }) {
  const motif = motifFor(seed);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 ${className ?? ""}`} aria-hidden>
      <div className="bg-columns absolute inset-0" />
      <MotifArt id={`cv-${seed.slice(0, 24)}`} motif={motif} className="absolute inset-0 m-auto h-[88%] w-auto transition-transform duration-700 group-hover:scale-105" />
    </div>
  );
}
