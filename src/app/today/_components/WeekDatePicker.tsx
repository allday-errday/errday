"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { shiftDateString } from "@/lib/dates";

type WeekDatePickerProps = {
  date: string;
  today: string;
};

const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
const swipeThreshold = 40;

export function WeekDatePicker({ date, today }: WeekDatePickerProps) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isNavigating = useRef(false);
  const weekStart = mondayFor(date);
  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDateString(weekStart, index),
  );

  function navigateToWeek(delta: number) {
    if (isNavigating.current) return;

    const target = shiftDateString(date, delta);
    if (target > today) {
      return;
    }

    isNavigating.current = true;
    router.push(`/today?date=${target}`, { scroll: false });
  }

  useEffect(() => {
    const previousWeek = shiftDateString(date, -7);
    router.prefetch(`/today?date=${previousWeek}`);

    const nextWeek = shiftDateString(date, 7);
    if (nextWeek <= today) {
      router.prefetch(`/today?date=${nextWeek}`);
    }
  }, [date, router, today]);

  return (
    <nav
      aria-label="Choose day"
      className="mb-6 touch-pan-y overflow-hidden sm:mb-8"
      onTouchCancel={() => {
        touchStart.current = null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || isNavigating.current) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (
          Math.abs(deltaX) < swipeThreshold ||
          Math.abs(deltaX) < Math.abs(deltaY) * 1.35
        ) {
          return;
        }

        navigateToWeek(deltaX > 0 ? -7 : 7);
      }}
      onTouchStart={(event) => {
        if (isNavigating.current) return;
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
    >
      <div className="grid w-full grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const isActive = day === date;
          const isFuture = day > today;
          const label = weekdayFormatter.format(new Date(`${day}T12:00:00`));
          const dayNumber = new Date(`${day}T12:00:00`).getDate();
          const content = (
            <>
              <span className="text-xs font-semibold leading-none text-zinc-500">
                {label}
              </span>
              <span
                className={`mt-2 grid size-10 place-items-center rounded-full text-sm font-bold transition sm:size-12 sm:text-base ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : isFuture
                      ? "text-zinc-500"
                      : "text-zinc-300 hover:bg-[var(--surface-2)] hover:text-white"
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
                className="flex min-w-0 flex-col items-center justify-start"
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
              className="flex min-w-0 flex-col items-center justify-start outline-offset-[-2px]"
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
