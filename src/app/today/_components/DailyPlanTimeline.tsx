import Link from "next/link";
import type { DailyPlanItem, DayType, PlanItemStatus } from "@/lib/daily-flow/types";
import { setTodayDayType } from "../actions";

type DailyPlanTimelineProps = {
  dayType: DayType;
  items: DailyPlanItem[];
};

const statusStyles: Record<PlanItemStatus, string> = {
  logged: "border-[#FF69B4] bg-[#FF69B4] text-black",
  upcoming: "border-zinc-300 bg-white text-zinc-500",
  missed: "border-zinc-300 bg-zinc-100 text-zinc-500",
};

const statusLabels: Record<PlanItemStatus, string> = {
  logged: "Logged",
  upcoming: "Upcoming",
  missed: "Missed",
};

export function DailyPlanTimeline({ dayType, items }: DailyPlanTimelineProps) {
  return (
    <section className="pb-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-normal text-zinc-500">
            Daily Plan
          </h2>
          <p className="mt-1 text-sm font-semibold text-black">
            {dayType === "gym" ? "Gym Day" : "Rest Day"}
          </p>
        </div>
        <div className="flex rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-black text-zinc-500">
          {(["rest", "gym"] as const).map((type) => (
            <form action={setTodayDayType} key={type}>
              <input name="day_type" type="hidden" value={type} />
              <button
                className={`rounded-full px-3 py-1 capitalize ${
                  dayType === type ? "bg-white text-black shadow-sm" : ""
                }`}
                type="submit"
              >
                {type}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70">
        <div className="space-y-1">
          {items.map((item, index) => (
            <Link
              className="grid grid-cols-[3.25rem_1rem_1fr] gap-3 rounded-2xl px-1 py-3 transition hover:bg-zinc-50"
              href={item.href}
              key={item.slot}
            >
              <span className="pt-0.5 text-xs font-black text-zinc-400">
                {item.targetTime}
              </span>
              <span className="relative flex justify-center">
                <span
                  className={`mt-0.5 size-3 rounded-full border-2 ${
                    statusStyles[item.status]
                  }`}
                />
                {index < items.length - 1 ? (
                  <span className="absolute top-5 h-[calc(100%+0.75rem)] w-px bg-zinc-200" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-black text-black">{item.label}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[0.68rem] font-black uppercase text-zinc-500">
                    {statusLabels[item.status]}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-zinc-500">
                  {item.detail}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
