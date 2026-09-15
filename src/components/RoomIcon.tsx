import {
  Bath,
  BedDouble,
  CookingPot,
  House,
  Sofa,
  Trees,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  sofa: Sofa,
  "cooking-pot": CookingPot,
  bed: BedDouble,
  bath: Bath,
  trees: Trees,
  house: House,
};

export function RoomIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] || House;
  return <Icon className={className} />;
}
