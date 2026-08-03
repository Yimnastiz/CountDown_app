import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Bell,
  BriefcaseBusiness,
  Cake,
  CalendarClock,
  CarFront,
  CircleHelp,
  ClockAlert,
  CreditCard,
  Dumbbell,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Palette,
  PartyPopper,
  PawPrint,
  Plane,
  ReceiptText,
  Repeat2,
  Shapes,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Tag,
  Tags,
  UserRound,
  UsersRound,
  Utensils,
  WalletCards,
  Wrench,
} from "lucide-react";

export const categoryIconRegistry: Record<string, LucideIcon> = {
  "user-round": UserRound,
  "briefcase-business": BriefcaseBusiness,
  "graduation-cap": GraduationCap,
  "wallet-cards": WalletCards,
  "car-front": CarFront,
  plane: Plane,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  house: House,
  "users-round": UsersRound,
  cake: Cake,
  "party-popper": PartyPopper,
  "file-text": FileText,
  "receipt-text": ReceiptText,
  "credit-card": CreditCard,
  "paw-print": PawPrint,
  palette: Palette,
  "gamepad-2": Gamepad2,
  laptop: Laptop,
  "shield-check": ShieldCheck,
  "calendar-clock": CalendarClock,
  wrench: Wrench,
  "badge-dollar-sign": BadgeDollarSign,
  landmark: Landmark,
  "clock-alert": ClockAlert,
  bell: Bell,
  repeat: Repeat2,
  shapes: Shapes,
  tag: Tag,
  tags: Tags,
  other: CircleHelp,
};
export const categoryIconLabels: Record<string, string> = Object.fromEntries(
  Object.keys(categoryIconRegistry).map((key) => [
    key,
    key
      .split("-")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" "),
  ]),
);
const legacyIconKeys: Record<string, string> = {
  Personal: "user-round",
  Heart: "user-round",
  Finance: "wallet-cards",
  WalletCards: "wallet-cards",
  Education: "graduation-cap",
  GraduationCap: "graduation-cap",
  Vehicle: "car-front",
  Car: "car-front",
  Health: "heart-pulse",
  HeartPulse: "heart-pulse",
  Documents: "file-text",
  FileText: "file-text",
  Birthday: "cake",
  Cake: "cake",
  Other: "other",
  Sparkles: "other",
  Tag: "tag",
};
export const normalizeIconKey = (key?: string) =>
  key && categoryIconRegistry[key]
    ? key
    : (legacyIconKeys[key ?? ""] ?? "shapes");
export const CategoryIcon = ({
  name,
  size = 16,
}: {
  name?: string;
  size?: number;
}) => {
  const Icon = categoryIconRegistry[normalizeIconKey(name)] ?? Shapes;
  return <Icon size={size} aria-hidden="true" />;
};
