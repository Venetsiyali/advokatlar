import {
  Baby, Briefcase, Car, Gavel, HandCoins, HardHat, HeartCrack, Home, Landmark, Map, Plane, Receipt,
  Scale, Scroll, ShieldAlert, Users, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  baby: Baby, briefcase: Briefcase, car: Car, gavel: Gavel, "hand-coins": HandCoins, "hard-hat": HardHat,
  "heart-crack": HeartCrack, home: Home, landmark: Landmark, map: Map, plane: Plane, receipt: Receipt,
  scale: Scale, scroll: Scroll, "shield-alert": ShieldAlert, users: Users,
};

export function TopicIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Scale;
  return <Icon className={className} aria-hidden />;
}
