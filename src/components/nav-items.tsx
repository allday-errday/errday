import {
  CalendarDays,
  Dumbbell,
  Home,
  Moon,
  NotebookPen,
  type LucideIcon,
  UserRound,
  Utensils,
} from "lucide-react";

export type NavIconName =
  | "calendar"
  | "food"
  | "gym"
  | "journal"
  | "profile"
  | "sleep"
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
  { href: "/sleep", icon: "sleep", label: "Sleep" },
  { href: "/journal", icon: "journal", label: "Journal" },
  { href: "/calendar", icon: "calendar", label: "Calendar" },
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
    calendar: CalendarDays,
    food: Utensils,
    gym: Dumbbell,
    journal: NotebookPen,
    profile: UserRound,
    sleep: Moon,
    today: Home,
  };
  const Icon = icons[name];

  return <Icon aria-hidden="true" className={className} strokeWidth={2} />;
}
