"use client";

import { useEffect, useState } from "react";

export type DailyStat = {
  helper: string;
  icon: "burned" | "calories" | "carbs" | "protein" | "sleep" | "water";
  label: string;
  progress: number;
  value: string;
};

type DailyStatsGridProps = {
  stats: DailyStat[];
};

const STORAGE_KEY = "errday.todayStats";
const DEFAULT_VISIBLE: DailyStat["icon"][] = [
  "calories",
  "burned",
  "protein",
  "carbs",
  "water",
];

export function DailyStatsGrid({ stats }: DailyStatsGridProps) {
  const [visible, setVisible] = useState<DailyStat["icon"][]>(DEFAULT_VISIBLE);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyStat["icon"][];
        if (Array.isArray(parsed)) {
          setVisible(parsed);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function toggle(icon: DailyStat["icon"]) {
    setVisible((current) => {
      const next = current.includes(icon)
        ? current.filter((i) => i !== icon)
        : [...current, icon];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const shown = stats.filter((stat) => visible.includes(stat.icon));

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-normal text-white">
          {editing ? "Pick your stats" : "Top Priorities"}
        </h2>
        <button
          aria-pressed={editing}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-bold transition ${
            editing
              ? "border-[var(--accent)] bg-[var(--accent)] text-black"
              : "border-white/10 bg-white/[0.03] text-[var(--accent)] hover:bg-white/[0.06]"
          }`}
          onClick={() => setEditing((v) => !v)}
          type="button"
        >
          <Icon name="sliders" />
          {editing ? "Done" : "Customize"}
        </button>
      </div>

      {editing ? (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-3">
          {stats.map((stat) => {
            const on = visible.includes(stat.icon);
            return (
              <button
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  on
                    ? "border-[var(--accent)]/60 bg-[var(--accent-soft)] text-white"
                    : "border-white/10 bg-white/[0.02] text-zinc-500"
                }`}
                key={stat.icon}
                onClick={() => toggle(stat.icon)}
                type="button"
              >
                <span className={on ? "text-[var(--accent)]" : "text-zinc-600"}>
                  <Icon name={stat.icon} />
                </span>
                <span className="flex-1 truncate">{stat.label}</span>
                <span className="text-xs">{on ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
          No stats selected. Tap Customize to add some.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((stat) => (
            <article
              className={`min-h-32 rounded-2xl border border-white/10 bg-[var(--bg-soft)]/90 p-3 text-center shadow-xl shadow-black/25 transition ${
                editing ? "ring-1 ring-[var(--accent)]/30" : ""
              }`}
              key={stat.label}
            >
              <div className="mx-auto grid size-8 place-items-center text-[var(--accent)]">
                <Icon name={stat.icon} />
              </div>
              <p className="mt-3 text-sm font-semibold text-zinc-300">{stat.label}</p>
              <p className="mt-2 whitespace-nowrap text-xl font-bold tracking-normal text-white">
                {stat.value}
              </p>
              <p className="mt-2 whitespace-nowrap text-xs font-semibold leading-5 text-zinc-500">
                {stat.helper}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--accent)]/25">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                  style={{ width: `${Math.max(6, Math.min(100, stat.progress * 100))}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Icon({ name }: { name: DailyStat["icon"] | "sliders" }) {
  const common = {
    "aria-hidden": true,
    className: "size-7",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.4,
    viewBox: "0 0 24 24",
  };

  if (name === "calories") {
    return <svg {...common}><path d="M12 22c3.3-1.5 5-4 5-7.4 0-2.7-1.5-5-4.4-7 .1 2.2-.7 3.7-2.3 4.5.2-3-1-5.7-3.8-8.1.1 3.7-1.1 6.4-3.4 8.2-.7.8-1.1 1.8-1.1 3 0 3.1 2.1 5.5 6.2 6.8-.7-1.1-1-2.2-.7-3.4.3-1.1 1.1-2 2.4-2.7-.1 2.1.6 4.1 2.1 6.1Z" /></svg>;
  }

  if (name === "burned") {
    return <svg {...common}><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" /></svg>;
  }

  if (name === "protein") {
    return <svg {...common}><path d="M8 19c3.8 0 8-2.6 8-8V5" /><path d="M16 11h3a3 3 0 0 1 0 6h-3" /><path d="M8 19a4 4 0 0 1-4-4" /></svg>;
  }

  if (name === "carbs") {
    return <svg {...common}><path d="M12 21V3" /><path d="M12 8c-3 0-5-1.7-6-5 3 0 5 1.7 6 5Z" /><path d="M12 14c-3 0-5-1.7-6-5 3 0 5 1.7 6 5Z" /><path d="M12 20c-3 0-5-1.7-6-5 3 0 5 1.7 6 5Z" /><path d="M12 8c3 0 5-1.7 6-5-3 0-5 1.7-6 5Z" /><path d="M12 14c3 0 5-1.7 6-5-3 0-5 1.7-6 5Z" /><path d="M12 20c3 0 5-1.7 6-5-3 0-5 1.7-6 5Z" /></svg>;
  }

  if (name === "water") {
    return <svg {...common}><path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" /></svg>;
  }

  if (name === "sleep") {
    return <svg {...common}><path d="M21 14.5A7.5 7.5 0 0 1 9.5 3 8.5 8.5 0 1 0 21 14.5Z" /></svg>;
  }

  return <svg {...common}><path d="M4 7h10" /><path d="M18 7h2" /><path d="M4 17h2" /><path d="M10 17h10" /><path d="M7 14v6" /><path d="M15 4v6" /></svg>;
}
