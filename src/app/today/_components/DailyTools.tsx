import Link from "next/link";
import { ChevronRight } from "lucide-react";

const tools = [
  { href: "/sleep", label: "Sleep" },
  { href: "/journal", label: "Journal" },
];

export function DailyTools() {
  return (
    <section className="mt-6 border-t border-[var(--border)] pt-5">
      <h2 className="text-lg font-bold text-white">More</h2>
      <div className="mt-2 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {tools.map((tool) => (
          <Link
            className="flex min-h-14 items-center justify-between text-sm font-bold text-zinc-300 transition hover:text-white"
            href={tool.href}
            key={tool.href}
          >
            {tool.label}
            <ChevronRight aria-hidden="true" className="size-4 text-[var(--accent)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
