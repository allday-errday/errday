import {
  Bell,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Moon,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import type { CalendarEvent } from "@/types/database";

const eventIcon = {
  general: CalendarDays,
  meal: Utensils,
  reminder: Bell,
  sleep: Moon,
  workout: Dumbbell,
};

export function NextUp({ event, today }: { event: CalendarEvent | null; today: string }) {
  const Icon = event ? eventIcon[event.category] : CalendarDays;
  const meta = event
    ? `${event.date === today ? "Today" : "Upcoming"}${event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ""}`
    : "Keep the day open";

  return (
    <section className="mt-6 max-w-4xl">
      <p className="mb-3 text-sm font-bold text-zinc-400">Next up</p>
      <Link
        className="flex min-h-20 items-center gap-4 rounded-xl bg-[var(--surface)] px-4 py-3 transition hover:bg-[var(--surface-2)]"
        href="/calendar"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-white">
            {event?.title ?? "Nothing planned"}
          </span>
          <span className="mt-1 block text-sm text-zinc-500">{meta}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-zinc-500" />
      </Link>
    </section>
  );
}
