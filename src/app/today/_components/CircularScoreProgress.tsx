import { DAILY_FLOW_ACCENT } from "@/lib/daily-flow/types";

type CircularScoreProgressProps = {
  score: number;
};

export function CircularScoreProgress({ score }: CircularScoreProgressProps) {
  const radius = 44;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative grid size-28 place-items-center">
      <svg
        aria-hidden="true"
        className="-rotate-90"
        height="112"
        viewBox="0 0 112 112"
        width="112"
      >
        <circle
          cx="56"
          cy="56"
          fill="none"
          r={radius}
          stroke="#f4f4f5"
          strokeWidth={stroke}
        />
        <circle
          cx="56"
          cy="56"
          fill="none"
          r={radius}
          stroke={DAILY_FLOW_ACCENT}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-black text-zinc-900">{score}%</span>
    </div>
  );
}
