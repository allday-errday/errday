import { CalendarDays } from "lucide-react";
import Link from "next/link";

type TodayHeaderProps = {
  isToday: boolean;
};

export function TodayHeader({
  isToday,
}: TodayHeaderProps) {
  return (
    <header className="mb-6 pt-1 sm:mb-8">
      <div className="flex max-w-4xl items-center justify-between gap-4">
        <h1 className="text-3xl font-bold leading-none text-white sm:text-4xl">
          {isToday ? (
            <>
              Today<span className="text-[var(--accent)]">.</span>
            </>
          ) : (
            <>
              Previous day<span className="text-[var(--accent)]">.</span>
            </>
          )}
        </h1>
        <Link
          aria-label="Open calendar"
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)] transition hover:bg-[var(--surface-3)]"
          href="/calendar"
        >
          <CalendarDays aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </header>
  );
}
