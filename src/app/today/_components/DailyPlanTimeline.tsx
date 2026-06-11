import Link from "next/link";
import type { DailyPlanItem, DayType, PlanItemStatus } from "@/lib/daily-flow/types";
import { setTodayDayType } from "../actions";

type DailyPlanTimelineProps = {
  dayType: DayType;
  items: DailyPlanItem[];
};

const statusStyles: Record<PlanItemStatus, string> = {
  logged: "border-[#FF69B4] bg-[#FF69B4] text-white",
  upcoming: "border-zinc-500 bg-[#111316] text-zinc-500",
  missed: "border-zinc-500 bg-[#181a1f] text-zinc-500",
};

const statusLabels: Record<PlanItemStatus, string> = {
  logged: "Logged",
  upcoming: "Upcoming",
  missed: "Missed",
};

export function DailyPlanTimeline({ dayType, items }: DailyPlanTimelineProps) {
  return (
    <section className="pb-3">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black tracking-normal text-white">
          Daily Plan
        </h2>
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-base font-black text-zinc-400">
          {(["rest", "gym"] as const).map((type) => (
            <form action={setTodayDayType} key={type}>
              <input name="day_type" type="hidden" value={type} />
              <button
                className={`min-h-12 rounded-full px-6 capitalize ${
                  dayType === type
                    ? "bg-[#FF69B4]/25 text-[#FF69B4] shadow-sm"
                    : "text-zinc-400"
                }`}
                type="submit"
              >
                {type} Day
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-[1.65rem] border border-white/10 bg-[#111316]/90 px-4 py-5 shadow-2xl shadow-black/30">
        <div>
          {items.map((item, index) => (
            <Link
              className="grid grid-cols-[4rem_2.75rem_3.75rem_minmax(0,1fr)_6.25rem_1rem] items-center gap-3 rounded-2xl py-3 transition hover:bg-white/[0.04]"
              href={item.href}
              key={item.slot}
            >
              <span className="text-base font-black text-zinc-400">
                {item.targetTime}
              </span>
              <span className="relative flex h-full justify-center">
                <span
                  className={`z-10 grid size-8 place-items-center rounded-full border-2 ${
                    statusStyles[item.status]
                  }`}
                >
                  {item.status === "logged" ? "✓" : null}
                </span>
                {index < items.length - 1 ? (
                  <span className="absolute top-8 h-[calc(100%+0.75rem)] w-px bg-zinc-600" />
                ) : null}
              </span>
              <span className="grid size-12 place-items-center rounded-full bg-[#FF69B4]/15 text-[#FF69B4]">
                <PlanIcon slot={item.slot} />
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-black text-white">{item.label}</span>
                <span className="mt-1 block truncate text-base font-semibold text-zinc-400">
                  {item.detail}
                </span>
              </span>
              <span className={`justify-self-end rounded-full px-4 py-2 text-sm font-black ${
                item.status === "logged"
                  ? "bg-[#FF69B4]/20 text-[#FF69B4]"
                  : "bg-white/[0.04] text-zinc-400"
              }`}>
                {statusLabels[item.status]}
              </span>
              <span className="text-3xl font-light text-zinc-400">›</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanIcon({ slot }: { slot: DailyPlanItem["slot"] }) {
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
