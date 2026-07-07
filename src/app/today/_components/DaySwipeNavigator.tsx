"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

function shiftDate(date: string, delta: number) {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + delta);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type DaySwipeNavigatorProps = {
  children: ReactNode;
  date: string;
  isToday: boolean;
};

export function DaySwipeNavigator({
  children,
  date,
  isToday,
}: DaySwipeNavigatorProps) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function goTo(delta: number) {
    const target = shiftDate(date, delta);
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
        goTo(-1);
      } else if (event.key === "ArrowRight" && !isToday) {
        goTo(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isToday]);

  return (
    <div
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
          // Swipe right → previous day
          goTo(-1);
        } else if (!isToday) {
          // Swipe left → next day (never beyond today)
          goTo(1);
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

export { shiftDate };
