import Link from "next/link";

const tools = [
  { href: "/sleep", label: "Sleep" },
  { href: "/journal", label: "Journal" },
];

export function DailyTools() {
  return (
    <section className="mt-6 border-t border-[var(--border)] pt-5">
      <h2 className="text-lg font-extrabold text-white">More</h2>
      <div className="mt-2 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {tools.map((tool) => (
          <Link
            className="flex min-h-14 items-center justify-between text-sm font-extrabold text-zinc-300 transition hover:text-white"
            href={tool.href}
            key={tool.href}
          >
            {tool.label}
            <span aria-hidden="true" className="text-lg font-normal text-[var(--accent)]">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
