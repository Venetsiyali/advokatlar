import { site } from "@/lib/site";

export function LogoMark({ className = "size-9" }: { className?: string }) {
  // Qalqon + tarozi motivi (placeholder logo)
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 3 6 8.5v10.2C6 27.6 12 34.6 20 37c8-2.4 14-9.4 14-18.3V8.5L20 3Z" fill="#102c4a" />
      <path d="M20 11v17M14 28h12M12 15h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15l-3 6h6l-3-6ZM28 15l-3 6h6l-3-6Z" fill="none" stroke="#12a06c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-navy-900">{site.brand}</span>
    </span>
  );
}
