"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { shiftDateString } from "@/lib/dates";

type DaySwipeNavigatorProps = {
  children: ReactNode;
  date: string;
  today: string;
};

export function DaySwipeNavigator({
  children,
  date,
  today,
}: DaySwipeNavigatorProps) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function goToWeek(delta: number) {
    const target = shiftDateString(date, delta);
    if (target > today) return;
    window.scrollTo(0, 0);
    router.push(`/today?date=${target}`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        goToWeek(-7);
      } else if (event.key === "ArrowRight") {
        goToWeek(7);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, today]);

  return (
    <div
      className="touch-pan-y"
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;

        if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.6) {
          return;
        }

        if (deltaX > 0) {
          // Swipe right → previous week
          goToWeek(-7);
        } else {
          // Swipe left → next week (never beyond today)
          goToWeek(7);
        }
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
    >
      {children}
    </div>
  );
}
