import Link from "next/link";

const actions = [
  { href: "/food", label: "Log Meal" },
  { href: "/gym", label: "Start Workout" },
  { href: "/journal", label: "Write Journal" },
  { href: "/settings", label: "Log Weight" },
];

export function QuickActionsGrid() {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-black uppercase tracking-normal text-zinc-500">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            className="flex min-h-16 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-black shadow-sm shadow-zinc-200/70 transition hover:border-[#FF69B4] hover:bg-zinc-50 active:scale-[0.98]"
            href={action.href}
            key={action.href}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
