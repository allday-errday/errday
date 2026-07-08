import Link from "next/link";
import type { DailyPlanItem, DayType, PlanItemStatus } from "@/lib/daily-flow/types";
import { setTodayDayType } from "../actions";

type DailyPlanTimelineProps = {
  dayType: DayType;
  items: DailyPlanItem[];
};

const statusStyles: Record<PlanItemStatus, string> = {
  logged: "border-[var(--signal)] bg-[var(--signal)] text-[var(--on-accent)]",
  upcoming: "border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]",
  missed: "border-white/15 bg-white/[0.03] text-zinc-600",
};

const statusLabels: Record<PlanItemStatus, string> = {
  logged: "Logged",
  upcoming: "Up next",
  missed: "Missed",
};

export function DailyPlanTimeline({ dayType, items }: DailyPlanTimelineProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your rhythm</p>
          <h2 className="mt-2 text-lg font-extrabold leading-tight text-white sm:text-xl">
            The day, mapped out.
          </h2>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm font-bold text-zinc-400">
          {(["rest", "gym"] as const).map((type) => (
            <form action={setTodayDayType} key={type}>
              <input name="day_type" type="hidden" value={type} />
              <button
                className={`min-h-10 rounded-full px-4 capitalize transition sm:px-5 ${
                  dayType === type
                    ? "bg-white text-[var(--on-accent)] shadow-sm"
                    : "text-zinc-500 hover:text-white"
                }`}
                type="submit"
              >
                {type} day
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-2 sm:p-5">
        {items.map((item, index) => (
          <Link
            className="group grid grid-cols-[3rem_1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl px-2 py-3.5 transition hover:bg-white/[0.04] sm:grid-cols-[4.5rem_2.25rem_3rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-4 sm:py-4"
            href={item.href}
            key={item.slot}
          >
            <span className="text-sm font-extrabold tabular-nums text-zinc-500 sm:text-base">
              {item.targetTime}
            </span>
            <span className="relative flex items-center justify-center self-stretch">
              {index > 0 ? (
                <span className="absolute left-1/2 top-0 h-[calc(50%-1.1rem)] w-px -translate-x-1/2 bg-white/10" />
              ) : null}
              {index < items.length - 1 ? (
                <span className="absolute bottom-0 left-1/2 h-[calc(50%-1.1rem)] w-px -translate-x-1/2 bg-white/10" />
              ) : null}
              <span className={`relative z-10 grid size-7 place-items-center rounded-full border text-xs font-extrabold ${statusStyles[item.status]}`}>
                {item.status === "logged" ? "✓" : ""}
              </span>
            </span>
            <span className="hidden size-11 place-items-center rounded-xl bg-white/[0.04] text-[var(--accent)] transition group-hover:bg-[var(--accent-soft)] sm:grid">
              <PlanIcon slot={item.slot} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-base font-extrabold text-white sm:text-lg">
                  {item.label}
                </span>
                {item.targetKcal ? (
                  <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.68rem] font-bold text-[var(--accent)]">
                    ~{item.targetKcal.toLocaleString("en-US")} kcal
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block truncate text-xs font-semibold text-zinc-500 sm:text-sm">
                {item.detail}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className={`hidden rounded-full px-3 py-1.5 text-xs font-bold sm:block ${
                item.status === "logged"
                  ? "bg-[var(--signal)]/10 text-[var(--signal)]"
                  : item.status === "upcoming"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-white/[0.03] text-zinc-600"
              }`}>
                {statusLabels[item.status]}
              </span>
              <span className="text-xl text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlanIcon({ slot }: { slot: DailyPlanItem["slot"] }) {
  const common = {
    "aria-hidden": true,
    className: "size-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
    viewBox: "0 0 24 24",
  };

  if (slot === "workout") {
    return <svg {...common}><path d="M6 8v8" /><path d="M18 8v8" /><path d="M2 10v4" /><path d="M22 10v4" /><path d="M8 12h8" /></svg>;
  }

  if (slot === "pre_workout" || slot === "post_workout") {
    return <svg {...common}><path d="M8 2h8" /><path d="M9 6h6" /><path d="M8 10h8v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10Z" /><path d="M10 15h4" /></svg>;
  }

  if (slot === "sleep") {
    return <svg {...common}><path d="M21 14.5A7.5 7.5 0 0 1 9.5 3 8.5 8.5 0 1 0 21 14.5Z" /></svg>;
  }

  return <svg {...common}><path d="M5 12h14" /><path d="M7 12a5 5 0 0 1 10 0" /><path d="M4 15h16" /><path d="M7 18h10" /><path d="M12 4v3" /></svg>;
}
