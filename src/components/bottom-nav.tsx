"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  marker: string;
};

const navItems: NavItem[] = [
  { href: "/today", label: "Today", marker: "T" },
  { href: "/gym", label: "Gym", marker: "G" },
  { href: "/food", label: "Food", marker: "F" },
  { href: "/sleep", label: "Sleep", marker: "S" },
  { href: "/journal", label: "Journal", marker: "J" },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-white/10 bg-[#080808]/95 px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition ${
                isActive
                  ? "bg-[#22c55e] text-black"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
              }`}
              href={item.href}
              key={item.href}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[0.7rem] font-black ${
                  isActive ? "bg-black/10" : "bg-white/5 text-zinc-300"
                }`}
              >
                {item.marker}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
