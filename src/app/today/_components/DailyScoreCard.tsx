import type { DailyScoreResult } from "@/lib/daily-flow/score";
import { CircularScoreProgress } from "./CircularScoreProgress";

type DailyScoreCardProps = {
  result: DailyScoreResult;
};

export function DailyScoreCard({ result }: DailyScoreCardProps) {
  const signals = [
    { label: "Fuel", value: result.breakdown.calories },
    { label: "Recovery", value: result.breakdown.sleep },
    { label: "Movement", value: result.breakdown.burnedCalories },
  ];

  return (
    <section className="flow-hero relative overflow-hidden rounded-xl border border-white/10 p-5 sm:p-8">
      <div className="flex h-full flex-col gap-6">
        <div>
          <p className="text-sm font-extrabold text-white">Today</p>
          <p className="mt-1 text-sm text-zinc-500">Today so far</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-8">
          <div>
            <p className="text-6xl font-extrabold leading-none text-white sm:text-7xl">
              {result.score}<span className="ml-2 text-2xl font-bold text-zinc-500">/100</span>
            </p>
            <p className="mt-3 text-sm font-semibold text-zinc-400">Daily score</p>
          </div>
          <CircularScoreProgress score={result.score} showValue={false} />
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5">
          {signals.map((signal) => (
            <div className="px-3 first:pl-0 last:pr-0" key={signal.label}>
              <p className="text-xs font-bold text-zinc-500">{signal.label}</p>
              <p className="mt-1 text-lg font-extrabold text-white sm:text-xl">
                {Math.round(signal.value)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
