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
    <section className="flow-hero relative isolate min-h-[28rem] overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-[0_35px_100px_-45px_rgba(93,73,255,0.75)] sm:p-8 lg:p-10">
      <div className="absolute -right-24 -top-32 -z-10 size-[28rem] rounded-full bg-[var(--accent)]/35 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 -z-10 size-80 rounded-full bg-[#4f34ff]/25 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between gap-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="eyebrow text-[#c4bdff]">Daily flow score</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-white">
              <span className="size-2 rounded-full bg-[var(--signal)] shadow-[0_0_12px_var(--signal)]" />
              {result.status} momentum
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white/55">
            Live
          </span>
        </div>

        <CircularScoreProgress score={result.score} />

        <div>
          <p className="max-w-xl text-xl font-semibold leading-8 text-white/80">
            {result.message}
          </p>
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
            {signals.map((signal) => (
              <div key={signal.label}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                  {signal.label}
                </p>
                <p className="mt-2 text-xl font-extrabold text-white">
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
