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
    <section className="flow-hero relative min-h-[23rem] overflow-hidden rounded-xl border border-white/10 p-5 sm:min-h-[27rem] sm:p-8 lg:p-10">
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          <p className="text-sm font-extrabold text-white">Daily flow</p>
          <p className="mt-1 text-sm text-zinc-400">{result.status} momentum</p>
        </div>

        <CircularScoreProgress score={result.score} />

        <div>
          <p className="max-w-xl text-base font-semibold leading-7 text-white/80 sm:text-lg sm:leading-8">
            {result.message}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 sm:mt-7 sm:gap-3 sm:pt-6">
            {signals.map((signal) => (
              <div key={signal.label}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                  {signal.label}
                </p>
                <p className="mt-2 text-lg font-extrabold text-white sm:text-xl">
                  {Math.round(signal.value)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
