import { DAILY_FLOW_ACCENT } from "@/lib/daily-flow/types";

type CircularScoreProgressProps = {
  score: number;
};

export function CircularScoreProgress({ score }: CircularScoreProgressProps) {
  const radius = 52;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative mx-auto grid size-48 place-items-center sm:size-56">
      <svg
        aria-hidden="true"
        className="size-full -rotate-90 drop-shadow-[0_0_22px_rgba(148,136,255,0.35)]"
        viewBox="0 0 136 136"
      >
        <circle
          cx="68"
          cy="68"
          fill="none"
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx="68"
          cy="68"
          fill="none"
          r={radius}
          stroke={DAILY_FLOW_ACCENT}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute grid place-items-center text-white">
        <span className="text-6xl font-extrabold leading-none tracking-[-0.07em]">
          {score}
        </span>
        <span className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
          of 100
        </span>
      </span>
    </div>
  );
}
