import type { DailyScoreResult } from "@/lib/daily-flow/score";
import { CircularScoreProgress } from "./CircularScoreProgress";

type DailyScoreCardProps = {
  result: DailyScoreResult;
};

export function DailyScoreCard({ result }: DailyScoreCardProps) {
  return (
    <section className="mb-7 rounded-[1.65rem] border border-white/10 bg-[#111316]/85 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#FF69B4]">Daily Flow Score</p>
          <div className="mt-2 flex items-end gap-1">
            <p className="text-7xl font-black leading-none tracking-normal text-white">
              {result.score}
            </p>
            <p className="pb-2 text-3xl font-black text-zinc-400">/100</p>
          </div>
          <p className="mt-4 inline-flex rounded-xl bg-[#FF69B4]/30 px-4 py-2 text-lg font-black text-[#FF69B4]">
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
