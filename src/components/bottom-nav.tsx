"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, navItems } from "@/components/nav-items";
import { resetPageScroll } from "@/components/navigation-scroll";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid min-h-16 w-full max-w-md grid-cols-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-bold transition ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
                href={item.href}
                key={item.href}
                onClick={resetPageScroll}
                scroll
              >
                <span className="grid size-6 place-items-center">
                  <NavIcon className="size-5" name={item.icon} />
                </span>
                <span>{item.label}</span>
                <span className={`absolute inset-x-6 top-0 h-0.5 ${isActive ? "bg-[var(--accent)]" : "bg-transparent"}`} />
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
