"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  icon: "food" | "gym" | "journal" | "sleep" | "today";
  label: string;
};

const navItems: NavItem[] = [
  { href: "/today", icon: "today", label: "Today" },
  { href: "/gym", icon: "gym", label: "Gym" },
  { href: "/food", icon: "food", label: "Food" },
  { href: "/sleep", icon: "sleep", label: "Sleep" },
  { href: "/journal", icon: "journal", label: "Journal" },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2">
      <div className="rounded-2xl border border-white/10 bg-[#111316]/95 px-3 py-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold transition ${
                  isActive
                  ? "text-[#FF69B4]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
              href={item.href}
              key={item.href}
            >
              <span
                className="grid size-7 place-items-center"
              >
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
              <span className={`mt-0.5 h-1 w-10 rounded-full ${isActive ? "bg-[#FF69B4]" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
      </div>
    </nav>
  );
}

function NavIcon({ name }: { name: NavItem["icon"] }) {
  const common = {
    "aria-hidden": true,
    className: "size-7",
    fill: name === "today" ? "currentColor" : "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.3,
    viewBox: "0 0 24 24",
  };

  if (name === "today") {
    return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V21h13V10.5" /></svg>;
  }

  if (name === "gym") {
    return <svg {...common}><path d="M6 8v8" /><path d="M18 8v8" /><path d="M2 10v4" /><path d="M22 10v4" /><path d="M8 12h8" /></svg>;
  }

  if (name === "food") {
    return <svg {...common}><path d="M5 3v8" /><path d="M9 3v8" /><path d="M5 7h4" /><path d="M7 11v10" /><path d="M15 3h2a3 3 0 0 1 3 3v15" /><path d="M15 3v9h5" /></svg>;
  }

  if (name === "sleep") {
    return <svg {...common}><path d="M21 14.5A7.5 7.5 0 0 1 9.5 3 8.5 8.5 0 1 0 21 14.5Z" /></svg>;
  }

  return <svg {...common}><path d="M6 3h11a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" /><path d="M7 7h8" /><path d="M7 11h8" /><path d="M7 15h5" /></svg>;
}
