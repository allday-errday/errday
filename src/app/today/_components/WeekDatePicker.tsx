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
const swipeThreshold = 48;
const maxDragDistance = 72;

export function WeekDatePicker({ date, today }: WeekDatePickerProps) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef(0);
  const isNavigating = useRef(false);
  const frame = useRef<number | null>(null);
  const swipeTimer = useRef<number | null>(null);
  const weekStart = mondayFor(date);
  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDateString(weekStart, index),
  );

  function paintTrack(offset: number, animated = false) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animated
      ? "transform 170ms cubic-bezier(0.22, 0.8, 0.2, 1)"
      : "none";
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function queueTrackPaint(offset: number) {
    dragOffset.current = offset;
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      paintTrack(dragOffset.current);
      frame.current = null;
    });
  }

  function resetTrack(animated = true) {
    dragOffset.current = 0;
    paintTrack(0, animated);
  }

  function navigateToWeek(delta: number) {
    if (isNavigating.current) return;

    const target = shiftDateString(date, delta);
    if (target > today) {
      resetTrack();
      return;
    }

    isNavigating.current = true;
    paintTrack(delta > 0 ? -20 : 20, true);
    swipeTimer.current = window.setTimeout(() => {
      router.push(`/today?date=${target}`, { scroll: false });
    }, 120);
  }

  useEffect(() => {
    const previousWeek = shiftDateString(date, -7);
    router.prefetch(`/today?date=${previousWeek}`);

    const nextWeek = shiftDateString(date, 7);
    if (nextWeek <= today) {
      router.prefetch(`/today?date=${nextWeek}`);
    }
  }, [date, router, today]);

  useEffect(
    () => () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      if (swipeTimer.current !== null) window.clearTimeout(swipeTimer.current);
    },
    [],
  );

  return (
    <nav
      aria-label="Choose day"
      className="mb-6 touch-pan-y overflow-hidden sm:mb-8"
      onTouchCancel={() => {
        touchStart.current = null;
        resetTrack();
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
          resetTrack();
          return;
        }

        navigateToWeek(deltaX > 0 ? -7 : 7);
      }}
      onTouchMove={(event) => {
        if (isNavigating.current) return;
        const start = touchStart.current;
        if (!start) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;

        queueTrackPaint(
          Math.max(-maxDragDistance, Math.min(maxDragDistance, deltaX)),
        );
      }}
      onTouchStart={(event) => {
        if (isNavigating.current) return;
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
        resetTrack(false);
      }}
    >
      <div
        className="grid w-full grid-cols-7 gap-1.5 will-change-transform sm:gap-3"
        ref={trackRef}
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
                className={`mt-1 grid size-10 place-items-center rounded-full text-sm font-bold transition sm:size-12 sm:text-base ${
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
