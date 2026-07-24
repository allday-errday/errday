import {
  Dumbbell,
  Home,
  LayoutGrid,
  type LucideIcon,
  UserRound,
  Utensils,
} from "lucide-react";

export type NavIconName =
  | "food"
  | "gym"
  | "plan"
  | "profile"
  | "today";

export type NavItem = {
  href: string;
  icon: NavIconName;
  label: string;
};

export const navItems: NavItem[] = [
  { href: "/today", icon: "today", label: "Today" },
  { href: "/gym", icon: "gym", label: "Gym" },
  { href: "/food", icon: "food", label: "Food" },
  { href: "/plan", icon: "plan", label: "Plan" },
  { href: "/settings", icon: "profile", label: "Profile" },
];

export function NavIcon({
  name,
  className = "size-7",
}: {
  name: NavIconName;
  className?: string;
}) {
  const icons: Record<NavIconName, LucideIcon> = {
    food: Utensils,
    gym: Dumbbell,
    plan: LayoutGrid,
    profile: UserRound,
    today: Home,
  };
  const Icon = icons[name];

  return <Icon aria-hidden="true" className={className} strokeWidth={2} />;
}
