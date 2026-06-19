import Link from "next/link";

const actions = [
  { href: "/food/search", icon: "meal", label: "Log Meal" },
  { href: "/gym", icon: "workout", label: "Start Workout" },
  { href: "/journal", icon: "journal", label: "Write Journal" },
  { href: "/settings", icon: "weight", label: "Log Weight" },
];

export function QuickActionsGrid() {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-bold tracking-normal text-white">
        Quick Actions
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((action) => (
          <Link
            className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[var(--bg-soft)]/90 px-2 text-center text-sm font-bold text-white shadow-xl shadow-black/25 transition hover:border-[var(--accent)]/60 hover:bg-white/[0.06] active:scale-[0.98]"
            href={action.href}
            key={action.href}
          >
            <span className="text-[var(--accent)]">
              <ActionIcon name={action.icon} />
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActionIcon({ name }: { name: string }) {
  const common = {
    "aria-hidden": true,
    className: "size-10",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.3,
    viewBox: "0 0 24 24",
  };

  if (name === "meal") {
    return <svg {...common}><path d="M5 3v8" /><path d="M9 3v8" /><path d="M5 7h4" /><path d="M7 11v10" /><path d="M15 3h2a3 3 0 0 1 3 3v15" /><path d="M15 3v9h5" /></svg>;
  }

  if (name === "workout") {
    return <svg {...common}><path d="M6 8v8" /><path d="M18 8v8" /><path d="M2 10v4" /><path d="M22 10v4" /><path d="M8 12h8" /></svg>;
  }

  if (name === "journal") {
    return <svg {...common}><path d="M6 3h11a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" /><path d="M7 7h8" /><path d="M7 11h8" /><path d="M7 15h5" /></svg>;
  }

  return <svg {...common}><path d="M5 7h14v13H5z" /><path d="M8 7a4 4 0 0 1 8 0" /><path d="M12 12h.01" /></svg>;
}
