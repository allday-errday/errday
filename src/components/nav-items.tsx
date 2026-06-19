export type NavIconName = "food" | "gym" | "journal" | "sleep" | "today";

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
];

export function NavIcon({
  name,
  className = "size-7",
}: {
  name: NavIconName;
  className?: string;
}) {
  const common = {
    "aria-hidden": true,
    className,
    fill: name === "today" ? "currentColor" : "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.3,
    viewBox: "0 0 24 24",
  };

  if (name === "today") {
    return (
      <svg {...common}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V21h13V10.5" />
      </svg>
    );
  }

  if (name === "gym") {
    return (
      <svg {...common}>
        <path d="M6 8v8" />
        <path d="M18 8v8" />
        <path d="M2 10v4" />
        <path d="M22 10v4" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (name === "food") {
    return (
      <svg {...common}>
        <path d="M5 3v8" />
        <path d="M9 3v8" />
        <path d="M5 7h4" />
        <path d="M7 11v10" />
        <path d="M15 3h2a3 3 0 0 1 3 3v15" />
        <path d="M15 3v9h5" />
      </svg>
    );
  }

  if (name === "sleep") {
    return (
      <svg {...common}>
        <path d="M21 14.5A7.5 7.5 0 0 1 9.5 3 8.5 8.5 0 1 0 21 14.5Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3h11a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
      <path d="M7 7h8" />
      <path d="M7 11h8" />
      <path d="M7 15h5" />
    </svg>
  );
}
