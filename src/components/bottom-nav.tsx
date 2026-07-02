"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, navItems } from "@/components/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-soft)]/95 px-2 py-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.68rem] font-bold transition ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
                href={item.href}
                key={item.href}
              >
                <span className="grid size-6 place-items-center">
                  <NavIcon className="size-5" name={item.icon} />
                </span>
                <span>{item.label}</span>
                <span className={`mt-0.5 h-1 w-8 rounded-full ${isActive ? "bg-[var(--accent)]" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
