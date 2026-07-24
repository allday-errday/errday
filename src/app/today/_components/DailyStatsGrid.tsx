"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type DailyStat = {
  helper: string;
  icon:
    | "burned"
    | "calories"
    | "carbs"
    | "fat"
    | "protein"
    | "sleep"
    | "steps"
    | "water";
  label: string;
  progress: number;
  value: string;
};

type DailyStatsGridProps = {
  stats: DailyStat[];
};

const STORAGE_KEY = "errday.todayStats.v3";
const DEFAULT_VISIBLE: DailyStat["icon"][] = [
  "calories",
  "burned",
  "protein",
  "water",
  "sleep",
  "steps",
];
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_VISIBLE);
const CHANGE_EVENT = "errday:today-stats-change";
const STAT_ICONS = new Set<DailyStat["icon"]>([
  "burned",
  "calories",
  "carbs",
  "fat",
  "protein",
  "sleep",
  "steps",
  "water",
]);

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
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_VISIBLE;
    }

    return parsed.filter((item): item is DailyStat["icon"] => {
      return typeof item === "string" && STAT_ICONS.has(item as DailyStat["icon"]);
    });
  } catch {
    return DEFAULT_VISIBLE;
  }
}

function gridClassName(count: number) {
  const base = "grid gap-3";

  if (count <= 1) {
    return `${base} sm:max-w-64`;
  }

  if (count === 2) {
    return `${base} sm:grid-cols-2`;
  }

  if (count === 3) {
    return `${base} sm:grid-cols-3`;
  }

  if (count === 4) {
    return `${base} sm:grid-cols-2 xl:grid-cols-4`;
  }

  if (count === 5) {
    return `${base} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`;
  }

  if (count === 6) {
    return `${base} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`;
  }

  return `${base} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
}

export function DailyStatsGrid({ stats }: DailyStatsGridProps) {
  const [customizing, setCustomizing] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribeToStats,
    getStoredStats,
    getServerStats,
  );
  const visible = parseVisible(snapshot);

  useEffect(() => {
    if (!customizing) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCustomizing(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [customizing]);

  function saveVisible(next: DailyStat["icon"][]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Storage is optional; the dashboard still works without it.
    }
  }

  function toggle(icon: DailyStat["icon"]) {
    const next = visible.includes(icon)
      ? visible.filter((item) => item !== icon)
      : [...visible, icon];
    saveVisible(next);
  }

  function resetVisible() {
    const availableDefaults = DEFAULT_VISIBLE.filter((icon) => {
      return stats.some((stat) => stat.icon === icon);
    });
    saveVisible(availableDefaults);
  }

  function showAll() {
    saveVisible(stats.map((stat) => stat.icon));
  }

  const shown = stats.filter((stat) => visible.includes(stat.icon));

  return (
    <section className="py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2 className="mt-2 text-lg font-bold leading-tight text-white sm:text-xl">
            Your vital signals.
          </h2>
        </div>
        <button
          aria-controls="daily-stats-customizer"
          aria-expanded={customizing}
          aria-haspopup="dialog"
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition sm:px-5 ${
            customizing
              ? "border-white bg-white text-black"
              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]"
          }`}
          onClick={() => setCustomizing(true)}
          type="button"
        >
          <Icon className="size-5" name="sliders" />
          Customize
        </button>
      </div>

      {customizing && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[9999] grid place-items-center px-4 py-6">
          <button
            aria-label="Close customize signals"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setCustomizing(false)}
            type="button"
          />
          <div
            aria-labelledby="daily-stats-customizer-title"
            aria-modal="true"
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-white/12 bg-[var(--bg)]/95 shadow-sm shadow-black/50"
            id="daily-stats-customizer"
            role="dialog"
          >
            <div className="border-b border-white/10 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Customize</p>
                  <h3
                    className="mt-2 text-2xl font-bold text-white"
                    id="daily-stats-customizer-title"
                  >
                    Choose your signals.
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                    Pick exactly what should show up in your At a glance
                    dashboard.
                  </p>
                </div>
                <button
                  aria-label="Close"
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-xl font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  onClick={() => setCustomizing(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[min(62vh,32rem)] overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {stats.map((stat) => {
                  const on = visible.includes(stat.icon);
                  return (
                    <button
                      aria-pressed={on}
                      className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition ${
                        on
                          ? "border-[var(--accent)]/60 bg-[var(--accent-soft)] text-white shadow-lg shadow-[var(--accent)]/10"
                          : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-white/20 hover:bg-white/[0.05] hover:text-zinc-200"
                      }`}
                      key={stat.icon}
                      onClick={() => toggle(stat.icon)}
                      type="button"
                    >
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                          on
                            ? "bg-[var(--accent)] text-[var(--on-accent)]"
                            : "bg-white/[0.05] text-zinc-500"
                        }`}
                      >
                        <Icon className="size-6" name={stat.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-current">
                          {stat.label}
                        </span>
                        <span className="mt-1 block truncate text-xs font-semibold text-zinc-500">
                          {stat.value} {stat.helper}
                        </span>
                      </span>
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                          on
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                            : "border-white/10 text-zinc-600"
                        }`}
                      >
                        {on ? "\u2713" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-xs font-semibold text-zinc-500">
                {shown.length} of {stats.length} shown
              </p>
              <div className="grid grid-cols-3 gap-2 sm:flex">
                <button
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  onClick={resetVisible}
                  type="button"
                >
                  Default
                </button>
                <button
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  onClick={showAll}
                  type="button"
                >
                  Show all
                </button>
                <button
                  className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[var(--on-accent)] transition hover:bg-[var(--accent)]"
                  onClick={() => setCustomizing(false)}
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
          No stats selected. Tap Customize to add some.
        </p>
      ) : (
        <div className={gridClassName(shown.length)}>
          {shown.map((stat) => (
            <article
              className={`group min-h-32 rounded-xl border border-white/10 bg-[var(--bg-soft)]/80 p-4 text-left shadow-sm shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20 ${
                customizing ? "ring-1 ring-[var(--accent)]/30" : ""
              }`}
              key={stat.icon}
            >
              <div className="grid size-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-[var(--on-accent)]">
                <Icon className="size-5" name={stat.icon} />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                {stat.label}
              </p>
              <p className="mt-1 whitespace-nowrap text-xl font-bold text-white sm:text-2xl">
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

function Icon({
  className = "size-5",
  name,
}: {
  className?: string;
  name: DailyStat["icon"] | "sliders";
}) {
  const common = {
    "aria-hidden": true,
    className: `block shrink-0 ${className}`,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.25,
    viewBox: "0 0 24 24",
  };

  if (name === "calories") {
    return (
      <svg {...common}>
        <path d="M12 22a7 7 0 0 0 7-7c0-3.8-2.5-6.7-5.7-10.9-.2 2.4-1.1 4.1-2.8 5.1C10.1 7.1 8.9 5.3 7 3.8 7.2 7.1 6.2 9.5 4.3 11A6.3 6.3 0 0 0 5 18.7 7 7 0 0 0 12 22Z" />
        <path d="M12.2 18.6c1.5-.7 2.3-1.8 2.3-3.1 0-1.1-.5-2-1.6-2.7-.1.9-.6 1.7-1.5 2.2-.1-1.2-.8-2.3-2-3.3.1 1.5-.4 2.7-1.4 3.4-.3.4-.5.9-.5 1.4 0 1.2.8 2 2.4 2.4-.2-.5-.2-1 0-1.4.2-.4.5-.8 1.1-1.1 0 .8.4 1.5 1.2 2.2Z" />
      </svg>
    );
  }

  if (name === "burned") {
    return (
      <svg {...common}>
        <path d="M13.5 2.5 5 13.5h6.2L10.5 22 19 10.5h-6.2l.7-8Z" />
      </svg>
    );
  }

  if (name === "protein") {
    return (
      <svg {...common}>
        <path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" />
        <path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59" />
      </svg>
    );
  }

  if (name === "carbs") {
    return (
      <svg {...common}>
        <path d="M5.5 20v-8.5C5.5 7.4 8.4 4 12 4s6.5 3.4 6.5 7.5V20h-13Z" />
        <path d="M8.5 13h.01" />
        <path d="M12 10.5h.01" />
        <path d="M15.5 13h.01" />
        <path d="M9 16.5h6" />
      </svg>
    );
  }

  if (name === "fat") {
    return (
      <svg {...common}>
        <path d="M12 3.7c3.1 0 5.7 3.5 5.7 8 0 5-2.7 8.6-5.7 8.6S6.3 16.7 6.3 11.7c0-4.5 2.6-8 5.7-8Z" />
        <path d="M12 16.1a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" />
      </svg>
    );
  }

  if (name === "water") {
    return (
      <svg {...common}>
        <path d="M12 3s6 6.1 6 10.8a6 6 0 0 1-12 0C6 9.1 12 3 12 3Z" />
        <path d="M8.6 14.5c1 .8 2.1 1.2 3.4 1.2s2.4-.4 3.4-1.2" />
      </svg>
    );
  }

  if (name === "sleep") {
    return (
      <svg {...common}>
        <path d="M20.5 14.5A7.5 7.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
        <path d="M16 4.5h3" />
        <path d="M17.5 3v3" />
      </svg>
    );
  }

  if (name === "steps") {
    return (
      <svg {...common}>
        <path d="M7 3c1.8 0 3 1.6 3 4 0 1.8-.6 3-2.2 3S5 8.8 5 6.5C5 4.4 5.8 3 7 3Z" />
        <path d="M6.2 12.5h3.4l.2 2.6a2 2 0 0 1-2 2.2 2 2 0 0 1-2-2.2l.4-2.6Z" />
        <path d="M17 7c1.2 0 2 1.4 2 3.5 0 2.3-.8 3.5-2.8 3.5S14 12.8 14 11c0-2.4 1.2-4 3-4Z" />
        <path d="M14.4 16.5h3.4l.4 2.4a2 2 0 0 1-2 2.3 2 2 0 0 1-2-2.3l.2-2.4Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M7 14v6" />
      <path d="M15 4v6" />
    </svg>
  );
}
