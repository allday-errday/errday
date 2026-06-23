"use client";

import { useState, useSyncExternalStore } from "react";

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
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_VISIBLE);
const CHANGE_EVENT = "errday:today-stats-change";

function getStoredStats() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SNAPSHOT;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function getServerStats() {
  return DEFAULT_SNAPSHOT;
}

function subscribeToStats(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function parseVisible(snapshot: string): DailyStat["icon"][] {
  try {
    const parsed = JSON.parse(snapshot) as DailyStat["icon"][];
    return Array.isArray(parsed) ? parsed : DEFAULT_VISIBLE;
  } catch {
    return DEFAULT_VISIBLE;
  }
}

export function DailyStatsGrid({ stats }: DailyStatsGridProps) {
  const [editing, setEditing] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribeToStats,
    getStoredStats,
    getServerStats,
  );
  const visible = parseVisible(snapshot);

  function toggle(icon: DailyStat["icon"]) {
    const next = visible.includes(icon)
      ? visible.filter((item) => item !== icon)
      : [...visible, icon];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Storage is optional; the dashboard still works without it.
    }
  }

  const shown = stats.filter((stat) => visible.includes(stat.icon));

  return (
    <section className="py-10 lg:py-14">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-white sm:text-4xl">
            {editing ? "Pick your signals." : "Your vital signals."}
          </h2>
        </div>
        <button
          aria-pressed={editing}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition sm:px-5 ${
            editing
              ? "border-white bg-white text-black"
              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]"
          }`}
          onClick={() => setEditing((v) => !v)}
          type="button"
        >
          <Icon name="sliders" />
          {editing ? "Done" : "Customize"}
        </button>
      </div>

      {editing ? (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-3 lg:grid-cols-6">
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {shown.map((stat) => (
            <article
              className={`group min-h-44 rounded-2xl border border-white/10 bg-[var(--bg-soft)]/80 p-5 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20 ${
                editing ? "ring-1 ring-[var(--accent)]/30" : ""
              }`}
              key={stat.label}
            >
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-black">
                <Icon name={stat.icon} />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.13em] text-zinc-500">{stat.label}</p>
              <p className="mt-2 whitespace-nowrap text-2xl font-extrabold tracking-[-0.04em] text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 whitespace-nowrap text-xs font-semibold leading-5 text-zinc-500">
                {stat.helper}
              </p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.07]">
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
