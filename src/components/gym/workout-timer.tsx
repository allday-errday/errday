"use client";

import { useEffect, useMemo, useState } from "react";

type WorkoutTimerProps = {
  startedAt: string;
};

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

export function WorkoutTimer({ startedAt }: WorkoutTimerProps) {
  const startMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startMs) / 1000)),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startMs]);

  return (
    <span className="rounded-full bg-[#d946ef] px-3 py-1 text-sm font-black tabular-nums text-black">
      {formatElapsed(elapsed)}
    </span>
  );
}
