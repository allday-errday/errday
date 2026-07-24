import { DAILY_FLOW_ACCENT } from "@/lib/daily-flow/types";

type CircularScoreProgressProps = {
  score: number;
  showValue?: boolean;
};

export function CircularScoreProgress({
  score,
  showValue = true,
}: CircularScoreProgressProps) {
  const radius = 52;
  const stroke = 11;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative grid size-36 place-items-center sm:size-44">
      <svg
        aria-hidden="true"
        className="size-full -rotate-90"
        viewBox="0 0 136 136"
      >
        <circle
          cx="68"
          cy="68"
          fill="none"
          r={radius}
          stroke="rgba(255, 255, 255, 0.22)"
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
      {showValue ? (
        <span className="absolute grid place-items-center text-white">
          <span className="text-4xl font-bold leading-none sm:text-5xl">
            {score}
          </span>
          <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-white/45">
            of 100
          </span>
        </span>
      ) : null}
    </div>
  );
}
