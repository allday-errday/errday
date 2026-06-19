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
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[var(--sidebar-width)] flex-col border-r border-[var(--border)] bg-[var(--bg-soft)] px-4 py-7 lg:flex">
      <Link className="mb-9 flex items-center gap-2 px-2" href="/today">
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-lg font-bold text-black">
          E
        </span>
        <span className="text-xl font-bold tracking-tight text-white">
          Errday
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
              }`}
              href={item.href}
              key={item.href}
            >
              <NavIcon className="size-5" name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
          pathname === "/settings"
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
        }`}
        href="/settings"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          viewBox="0 0 24 24"
        >
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
        <span>Settings</span>
      </Link>
    </aside>
  );
}
