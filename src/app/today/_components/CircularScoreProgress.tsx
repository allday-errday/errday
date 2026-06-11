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
    <div className="relative grid size-40 place-items-center">
      <svg
        aria-hidden="true"
        className="-rotate-90"
        height="160"
        viewBox="0 0 136 136"
        width="160"
      >
        <circle
          cx="68"
          cy="68"
          fill="none"
          r={radius}
          stroke="rgba(255, 105, 180, 0.22)"
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
        <span className="text-4xl font-black leading-none">{score}<span className="text-xl">%</span></span>
        <span className="mt-4 text-4xl text-[#FF69B4]">★</span>
      </span>
    </div>
  );
}
