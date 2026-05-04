import type { DailyScoreResult } from "@/lib/daily-flow/score";
import { CircularScoreProgress } from "./CircularScoreProgress";

type DailyScoreCardProps = {
  result: DailyScoreResult;
};

export function DailyScoreCard({ result }: DailyScoreCardProps) {
  return (
    <section className="mb-6 rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/80">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#FF69B4]">Daily Flow Score</p>
          <div className="mt-2 flex items-end gap-1">
            <p className="text-6xl font-black leading-none tracking-normal text-black">
              {result.score}
            </p>
            <p className="pb-1 text-xl font-black text-zinc-400">/100</p>
          </div>
          <p className="mt-3 inline-flex rounded-full bg-[#FF69B4]/10 px-3 py-1 text-sm font-black text-black">
            {result.status}
          </p>
        </div>
        <CircularScoreProgress score={result.score} />
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-600">{result.message}</p>
    </section>
  );
}
