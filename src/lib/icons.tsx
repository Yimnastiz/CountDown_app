import type { LucideIcon } from "lucide-react";
import {
  Cake,
  CarFront,
  CircleHelp,
  FileText,
  GraduationCap,
  HeartPulse,
  Tags,
  UserRound,
  WalletCards,
} from "lucide-react";
export const categoryIcons: Record<string, LucideIcon> = {
  Personal: UserRound,
  Finance: WalletCards,
  Education: GraduationCap,
  Vehicle: CarFront,
  Health: HeartPulse,
  Documents: FileText,
  Birthday: Cake,
  Other: CircleHelp,
  Tag: Tags,
};
export const CategoryIcon = ({
  name,
  size = 16,
}: {
  name?: string;
  size?: number;
}) => {
  const Icon = categoryIcons[name ?? "Tag"] ?? Tags;
  return <Icon size={size} aria-hidden="true" />;
};
