"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function goToWeek(delta: number) {
    const target = shiftDateString(date, delta);
    if (target > today) return;
    window.scrollTo(0, 0);
    router.push(`/today?date=${target}`);
  }

  function finishSwipe(delta: number) {
    const target = shiftDateString(date, delta);
    if (target > today) {
      setDragX(0);
      setIsDragging(false);
      return;
    }

    setDragX(delta < 0 ? 160 : -160);
    setIsDragging(false);
    window.setTimeout(() => goToWeek(delta), 150);
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
      onTouchCancel={() => {
        touchStart.current = null;
        setDragX(0);
        setIsDragging(false);
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;

        if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.6) {
          setDragX(0);
          setIsDragging(false);
          return;
        }

        if (deltaX > 0) {
          // Swipe right → previous week
          finishSwipe(-7);
        } else {
          // Swipe left → next week (never beyond today)
          finishSwipe(7);
        }
      }}
      onTouchMove={(event) => {
        const start = touchStart.current;
        if (!start) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

        setIsDragging(true);
        setDragX(Math.max(-96, Math.min(96, deltaX)));
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
    >
      <div
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
