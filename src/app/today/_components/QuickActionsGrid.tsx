import Link from "next/link";

const actions = [
  { href: "/food/search", icon: "meal", label: "Log meal", detail: "Fuel the day" },
  { href: "/gym", icon: "workout", label: "Start workout", detail: "Move with intent" },
  { href: "/journal", icon: "journal", label: "Write journal", detail: "Clear your head" },
  { href: "/settings", icon: "weight", label: "Log weight", detail: "Track the trend" },
];

export function QuickActionsGrid() {
  return (
    <section className="surface-panel flex h-full min-h-[22rem] flex-col p-5 sm:min-h-[28rem] sm:p-7">
      <div className="mb-5 sm:mb-6">
        <div>
          <p className="eyebrow">Quick moves</p>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            Move the day forward.
          </h2>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            className="group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/[0.08] active:scale-[0.98] sm:min-h-36"
            href={action.href}
            key={action.href}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-white/[0.06] text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-black">
              <ActionIcon name={action.icon} />
            </span>
            <span>
              <span className="block text-sm font-extrabold leading-tight text-white sm:text-base">{action.label}</span>
              <span className="mt-1 block text-xs font-semibold text-zinc-500">{action.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActionIcon({ name }: { name: string }) {
  const common = {
    "aria-hidden": true,
    className: "size-6",
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
