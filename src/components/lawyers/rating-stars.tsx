import { Star } from "lucide-react";

export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "size-5" : "size-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${value >= i - 0.25 ? "fill-gold-400 text-gold-400" : "fill-navy-100 text-navy-100"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}
