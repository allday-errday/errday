import { Apple, Footprints, Moon } from "lucide-react";
import type { DailyScoreResult } from "@/lib/daily-flow/score";

type DailyScoreCardProps = {
  insights: DailyInsight[];
  result: DailyScoreResult;
};

type DailyInsight = {
  helper: string;
  kind: "food" | "move" | "recover";
  label: string;
  value: string;
};

export function DailyScoreCard({ insights, result }: DailyScoreCardProps) {

  return (
    <section className="flow-hero relative overflow-hidden rounded-xl p-5 sm:p-8">
      <div className="flex h-full flex-col gap-8">
        <div>
          <p className="text-sm font-bold text-zinc-400">Daily score</p>
          <p className="mt-3 text-7xl font-bold leading-none text-white sm:text-8xl">
            {result.score}<span className="ml-2 text-2xl font-bold text-zinc-500 sm:text-3xl">/100</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {insights.map((insight) => {
            const Icon = insightIcon[insight.kind];

            return (
              <div className="min-w-0" key={insight.kind}>
                <Icon aria-hidden="true" className="size-5 text-[var(--accent)]" />
                <p className="mt-3 text-sm font-bold text-white">{insight.label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-300 sm:text-base">
                  {insight.value}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">{insight.helper}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const insightIcon = {
  food: Apple,
  move: Footprints,
  recover: Moon,
};
