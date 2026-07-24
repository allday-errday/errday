"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { NavIcon, navItems } from "@/components/nav-items";
import { resetPageScroll } from "@/components/navigation-scroll";

export function SideNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <header className="errday-top-nav z-30 border-b border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl">
      <div className="mx-auto grid min-h-16 max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3 sm:min-h-20 sm:px-8 sm:py-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 lg:px-12 lg:py-0">
        <BrandLogo className="justify-self-start" href="/today" markClassName="size-10 sm:size-11" wordmarkClassName="text-lg sm:text-xl" />

        <nav className="hidden lg:order-none lg:col-span-1 lg:mx-0 lg:mt-0 lg:grid lg:w-[34rem] lg:grid-cols-5 lg:justify-self-center lg:overflow-visible lg:px-0">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:w-full lg:px-2 ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                }`}
                href={item.href}
                key={item.href}
                onClick={resetPageScroll}
                scroll
              >
                <NavIcon className="size-[1.05rem]" name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div aria-hidden="true" className="hidden lg:block" />
      </div>
    </header>
  );
}
