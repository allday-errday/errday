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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--nav-bg)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid min-h-16 w-full max-w-md grid-cols-5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[0.68rem] font-bold transition ${
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
