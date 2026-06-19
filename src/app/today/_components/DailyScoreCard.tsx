import type { DailyScoreResult } from "@/lib/daily-flow/score";
import { CircularScoreProgress } from "./CircularScoreProgress";

type DailyScoreCardProps = {
  result: DailyScoreResult;
};

export function DailyScoreCard({ result }: DailyScoreCardProps) {
  return (
    <section className="mb-7 rounded-[1.65rem] border border-white/10 bg-[var(--bg-soft)]/85 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--accent)]">Daily Flow Score</p>
          <div className="mt-2 flex items-end gap-1">
            <p className="text-7xl font-bold leading-none tracking-normal text-white">
              {result.score}
            </p>
            <p className="pb-2 text-3xl font-bold text-zinc-400">/100</p>
          </div>
          <p className="mt-4 inline-flex rounded-xl bg-[var(--accent)]/30 px-4 py-2 text-lg font-bold text-[var(--accent)]">
            {result.status}
          </p>
        </div>
        <CircularScoreProgress score={result.score} />
      </div>
      <p className="mt-6 max-w-72 text-lg font-semibold leading-7 text-zinc-400">
        {result.message}
      </p>
    </section>
  );
}
