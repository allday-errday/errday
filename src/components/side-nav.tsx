"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, navItems } from "@/components/nav-items";

export function SideNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[var(--bg)]/78 backdrop-blur-2xl">
      <div className="mx-auto grid min-h-20 max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 lg:px-12 lg:py-0">
        <Link className="group flex shrink-0 items-center gap-3 justify-self-start" href="/today">
          <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-[var(--accent)] text-lg font-extrabold text-[#0a0910] shadow-[0_0_30px_rgba(143,130,255,0.25)] transition-transform group-hover:-rotate-3 group-hover:scale-105">
            E
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-[var(--signal)]" />
          </span>
          <span>
            <span className="block text-lg font-extrabold tracking-[-0.04em] text-white">
              errday
            </span>
            <span className="hidden text-[0.62rem] font-bold uppercase tracking-[0.18em] text-zinc-500 xl:block">
              All day. Errday.
            </span>
          </span>
        </Link>

        <nav className="no-scrollbar order-3 col-span-2 -mx-5 mt-4 flex w-[calc(100%+2.5rem)] gap-1 overflow-x-auto px-5 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 lg:order-none lg:col-span-1 lg:mx-0 lg:mt-0 lg:grid lg:w-[34rem] lg:grid-cols-5 lg:justify-self-center lg:overflow-visible lg:px-0">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition lg:w-full lg:px-2 ${
                  isActive
                    ? "bg-white shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                }`}
                href={item.href}
                key={item.href}
                style={isActive ? { color: "#101116" } : undefined}
              >
                <NavIcon className="size-[1.05rem]" name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-400 lg:flex">
            <span className="size-2 rounded-full bg-[var(--signal)] shadow-[0_0_12px_var(--signal)]" />
            Day live
          </span>
          <Link
            aria-current={pathname === "/coach" ? "page" : undefined}
            aria-label="Open Errday Coach"
            className={`grid size-11 place-items-center rounded-full border transition ${
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
            className={`grid size-11 place-items-center rounded-full border transition ${
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
