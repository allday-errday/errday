import Link from "next/link";
import { shiftDateString } from "@/lib/dates";

type WeekDatePickerProps = {
  date: string;
  today: string;
};

const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });

export function WeekDatePicker({ date, today }: WeekDatePickerProps) {
  const weekStart = mondayFor(date);
  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDateString(weekStart, index),
  );

  return (
    <nav aria-label="Choose day" className="no-scrollbar mb-6 overflow-x-auto sm:mb-8">
      <div className="grid min-w-[22rem] grid-cols-7 gap-1.5 sm:min-w-0 sm:gap-3">
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
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_10px_28px_rgba(139,130,246,0.34)]"
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
              className="flex min-h-[4.4rem] flex-col items-center justify-center rounded-xl outline-offset-[-2px]"
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
