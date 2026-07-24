import Link from "next/link";
import type { CalendarEvent } from "@/types/database";

const categoryDot: Record<CalendarEvent["category"], string> = {
  workout: "bg-[var(--accent)]",
  meal: "bg-emerald-400",
  sleep: "bg-sky-400",
  reminder: "bg-amber-400",
  general: "bg-zinc-400",
};

function dayLabel(date: string, today: string) {
  if (date === today) return "Today";
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function UpcomingEvents({
  events,
  today,
}: {
  events: CalendarEvent[];
  today: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Coming up</h2>
        <Link
          className="text-xs font-bold text-[var(--accent)] transition hover:brightness-125"
          href="/calendar"
        >
          Open calendar
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Nothing planned for the next days. Add a workout or reminder in the
          calendar — it syncs to your iPhone.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {events.map((event) => (
            <div
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-4 py-3"
              key={event.id}
            >
              <span
                className={`size-2 shrink-0 rounded-full ${categoryDot[event.category]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {event.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {dayLabel(event.date, today)}
                  {event.start_time
                    ? ` · ${event.start_time.slice(0, 5)}`
                    : " · All day"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
