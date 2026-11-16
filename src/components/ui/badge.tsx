import { cn } from "@/lib/utils";

const styles = {
  neutral: "bg-navy-50 text-navy-700",
  brand: "bg-brand-50 text-brand-700",
  gold: "bg-amber-50 text-amber-700",
  outline: "border border-navy-100 text-navy-700",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof styles;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", styles[variant], className)}>
      {children}
    </span>
  );
}
