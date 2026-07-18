"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { shiftDateString } from "@/lib/dates";

type WeekDatePickerProps = {
  date: string;
  today: string;
};

const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });

export function WeekDatePicker({ date, today }: WeekDatePickerProps) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const swipeTimer = useRef<number | null>(null);
  const weekStart = mondayFor(date);
  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDateString(weekStart, index),
  );

  function goToWeek(delta: number) {
    const target = shiftDateString(date, delta);
    if (target > today) return;
    router.push(`/today?date=${target}`);
  }

  function finishSwipe(delta: number) {
    if (isNavigating) return;

    const target = shiftDateString(date, delta);
    if (target > today) {
      setDragX(0);
      setIsDragging(false);
      return;
    }

    setIsNavigating(true);
    setDragX(delta < 0 ? 120 : -120);
    setIsDragging(false);
    swipeTimer.current = window.setTimeout(() => goToWeek(delta), 140);
  }

  useEffect(
    () => () => {
      if (swipeTimer.current !== null) {
        window.clearTimeout(swipeTimer.current);
      }
    },
    [],
  );

  return (
    <nav
      aria-label="Choose day"
      className="mb-6 overflow-hidden sm:mb-8"
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
        if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
          setDragX(0);
          setIsDragging(false);
          return;
        }

        finishSwipe(deltaX > 0 ? -7 : 7);
      }}
      onTouchMove={(event) => {
        if (isNavigating) return;
        const start = touchStart.current;
        if (!start) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

        setIsDragging(true);
        setDragX(Math.max(-72, Math.min(72, deltaX)));
      }}
      onTouchStart={(event) => {
        if (isNavigating) return;
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
    >
      <div
        className="grid w-full grid-cols-7 gap-1.5 sm:gap-3"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {days.map((day) => {
          const isActive = day === date;
          const isFuture = day > today;
          const label = weekdayFormatter.format(new Date(`${day}T12:00:00`));
          const dayNumber = new Date(`${day}T12:00:00`).getDate();
          const content = (
            <>
              <span className="text-[0.68rem] font-bold text-zinc-500 sm:text-xs">
                {label}
              </span>
              <span
                className={`mt-1 grid size-10 place-items-center rounded-full border text-sm font-extrabold transition sm:size-12 sm:text-base ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                    : isFuture
                      ? "border-white/[0.06] text-zinc-700"
                      : "border-dashed border-white/20 bg-white/[0.025] text-zinc-300 hover:border-[var(--accent)]/65 hover:bg-[var(--accent-soft)] hover:text-white"
                }`}
              >
                {dayNumber}
              </span>
            </>
          );

          if (isFuture) {
            return (
              <span
                aria-disabled="true"
                className="flex min-h-[4.4rem] flex-col items-center justify-center"
                key={day}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              aria-current={isActive ? "date" : undefined}
              aria-label={`${label}, ${dayNumber}`}
              className="flex min-h-[4.4rem] flex-col items-center justify-center outline-offset-[-2px]"
              href={`/today?date=${day}`}
              key={day}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function mondayFor(date: string) {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return shiftDateString(date, -daysSinceMonday);
}
