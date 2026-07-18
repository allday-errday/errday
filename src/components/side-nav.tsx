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
    <header className="errday-top-nav z-30 border-b border-white/[0.07] bg-[var(--bg)]">
      <div className="mx-auto grid min-h-16 max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3 sm:min-h-20 sm:px-8 sm:py-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 lg:px-12 lg:py-0">
        <BrandLogo className="justify-self-start" href="/today" markClassName="size-10 sm:size-11" wordmarkClassName="text-lg sm:text-xl" />

        <nav className="hidden lg:order-none lg:col-span-1 lg:mx-0 lg:mt-0 lg:grid lg:w-[40rem] lg:grid-cols-6 lg:justify-self-center lg:overflow-visible lg:px-0">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition lg:w-full lg:px-2 ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_10px_34px_rgba(139,130,246,0.22)]"
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

        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          <Link
            aria-current={pathname === "/coach" ? "page" : undefined}
            aria-label="Open Errday Coach"
            className={`grid size-10 place-items-center rounded-full border transition sm:size-11 ${
              pathname === "/coach"
                ? "border-[var(--signal)]/50 bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)]"
                : "border-white/[0.09] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
            href="/coach"
          >
            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m12 3-1.3 3.7L7 8l3.7 1.3L12 13l1.3-3.7L17 8l-3.7-1.3L12 3Z" />
              <path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8L5 14Z" />
              <path d="m19 13-.8 2.2L16 16l2.2.8L19 19l.8-2.2L22 16l-2.2-.8L19 13Z" />
            </svg>
          </Link>
          <Link
            aria-current={pathname === "/settings" ? "page" : undefined}
            aria-label="Open settings"
            className={`grid size-10 place-items-center rounded-full border transition sm:size-11 ${
              pathname === "/settings"
                ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-white"
                : "border-white/[0.09] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
            href="/settings"
          >
            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
