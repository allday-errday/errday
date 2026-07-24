import {
  Apple,
  Beef,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Droplets,
  Flame,
  Footprints,
  Moon,
  SlidersHorizontal,
  Wheat,
} from "lucide-react";
import Link from "next/link";
import type { DailyScoreResult } from "@/lib/daily-flow/score";
import type { DailyScoreInsightKey } from "@/lib/daily-flow/score-insights";

type DailyScoreCardProps = {
  focus: {
    detail: string;
    href?: string;
    label: string;
    state: "complete" | "open";
  };
  insights: DailyInsight[];
  result: DailyScoreResult;
  streak: number;
};

type DailyInsight = {
  helper: string;
  href?: string;
  kind: DailyScoreInsightKey;
  label: string;
  value: string;
};

export function DailyScoreCard({
  focus,
  insights,
  result,
  streak,
}: DailyScoreCardProps) {

  return (
    <section className="flow-hero relative overflow-hidden rounded-xl p-5 sm:p-8">
      <div className="flex h-full flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-zinc-400">Daily score</p>
            <p className="mt-3 text-7xl font-bold leading-none text-white sm:text-8xl">
              {result.score}<span className="ml-2 text-2xl font-bold text-zinc-500 sm:text-3xl">/100</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 text-sm font-semibold text-white">
              <Flame aria-hidden="true" className="size-4 text-amber-300" />
              {streak}
            </span>
            <Link
              aria-label="Edit Daily Score"
              className="grid size-9 place-items-center rounded-lg bg-[var(--surface-2)] text-zinc-300 transition hover:text-white"
              href="/settings?dailyScore=1#daily-score"
              title="Edit Daily Score"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {insights.map((insight) => {
            const Icon = insightIcon[insight.kind];

            const content = (
              <>
                <Icon aria-hidden="true" className="size-5 text-[var(--accent)]" />
                <p className="mt-3 text-sm font-bold text-white">{insight.label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-300 sm:text-base">
                  {insight.value}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">{insight.helper}</p>
              </>
            );

            if (insight.href) {
              return (
                <Link
                  className="min-w-0 rounded-lg outline-offset-2 transition hover:bg-[var(--surface-2)]"
                  href={insight.href}
                  key={insight.kind}
                >
                  {content}
                </Link>
              );
            }

            return <div className="min-w-0" key={insight.kind}>{content}</div>;
          })}
        </div>

        <FocusRow focus={focus} />
      </div>
    </section>
  );
}

function FocusRow({ focus }: Pick<DailyScoreCardProps, "focus">) {
  const Icon = focus.state === "complete" ? CircleCheck : CircleDot;
  const content = (
    <>
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-lg ${
              focus.state === "complete"
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-[var(--accent-soft)] text-[var(--accent)]"
            }`}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <p className="min-w-0 text-sm text-zinc-300">
            <span className="font-semibold text-white">{focus.label}</span>
            <span className="text-zinc-500"> · {focus.detail}</span>
          </p>
          {focus.href ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-zinc-500" /> : null}
    </>
  );

  if (focus.href) {
    return (
      <Link
        className="flex items-center gap-3 rounded-lg border-t border-[var(--border)] pt-4 transition hover:text-white"
        href={focus.href}
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">{content}</div>;
}

const insightIcon = {
  calories: Apple,
  protein: Beef,
  carbs: Wheat,
  steps: Footprints,
  water: Droplets,
  sleep: Moon,
};
