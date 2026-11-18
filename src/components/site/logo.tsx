import { site } from "@/lib/site";

export function LogoMark({ className = "size-9" }: { className?: string }) {
  // Qalqon + Themis tarozisi (toʻq koʻk va oltin)
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3ae" />
          <stop offset="1" stopColor="#c49a3c" />
        </linearGradient>
      </defs>
      <path d="M20 3 6 8.5v10.2C6 27.6 12 34.6 20 37c8-2.4 14-9.4 14-18.3V8.5L20 3Z" fill="#0b1f36" />
      <path d="M20 5.4 8.2 10v8.7c0 7.6 5 13.6 11.8 15.8 6.8-2.2 11.8-8.2 11.8-15.8V10L20 5.4Z" fill="none" stroke="url(#logo-gold)" strokeWidth="1" opacity="0.7" />
      <path d="M20 11v17M14.5 28h11M12 15h16" stroke="url(#logo-gold)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15l-3 6h6l-3-6ZM28 15l-3 6h6l-3-6Z" fill="none" stroke="url(#logo-gold)" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="20" cy="10.5" r="1.6" fill="#f6e3ae" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-1.5 sm:gap-2">
      <LogoMark className="size-8 sm:size-9" />
      {/* Tor telefonlarda (320–360 px) til tugmalari va menyu bilan bir qatorga sigʻishi uchun kichikroq */}
      <span className="font-display text-[1.05rem] font-extrabold tracking-tight text-navy-900 sm:text-xl">
        {/* “…Bor” qismi oltin rangda (brend nomi env orqali oʻzgarsa — butunicha) */}
        {site.brand.endsWith("Bor") ? (
          <>
            {site.brand.slice(0, -3)}
            <span className="text-brand-600">Bor</span>
          </>
        ) : (
          site.brand
        )}
      </span>
    </span>
  );
}
