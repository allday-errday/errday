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
    <section className="flow-hero relative isolate min-h-[24rem] overflow-hidden rounded-[1.5rem] border border-white/10 p-5 shadow-[0_35px_100px_-45px_rgba(93,73,255,0.75)] sm:min-h-[28rem] sm:rounded-[2rem] sm:p-8 lg:p-10">
      <div className="absolute -right-24 -top-32 -z-10 size-[28rem] rounded-full bg-[var(--accent)]/35 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 -z-10 size-80 rounded-full bg-[#4f34ff]/25 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between gap-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="eyebrow text-[var(--accent-strong)]">Daily flow score</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-white">
              <span className="size-2 rounded-full bg-[var(--signal)] shadow-[0_0_12px_var(--signal)]" />
              {result.status} momentum
            </p>
          </div>
        </div>

        <CircularScoreProgress score={result.score} />

        <div>
          <p className="max-w-xl text-base font-semibold leading-7 text-white/80 sm:text-xl sm:leading-8">
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
