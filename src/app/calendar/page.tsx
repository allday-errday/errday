import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import { listCalendarEvents } from "@/lib/db/calendar";
import { safeRead } from "@/lib/db/safe-read";
import { PageHeader } from "@/components/page-header";
import { CalendarView } from "./calendar-view";

function normalizeMonth(raw: string | undefined) {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
    return raw;
  }
  return todayDateString().slice(0, 7);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { month: rawMonth } = await searchParams;
  const month = normalizeMonth(rawMonth);
  const [year, monthNumber] = month.split("-").map(Number);

  // Load a padded window so the leading and trailing grid days show events too.
  const windowStart = new Date(Date.UTC(year, monthNumber - 1 - 1, 20));
  const windowEnd = new Date(Date.UTC(year, monthNumber, 12));
  const events = await safeRead(
    listCalendarEvents(
      supabase,
      user.id,
      windowStart.toISOString().slice(0, 10),
      windowEnd.toISOString().slice(0, 10),
    ),
    [],
    "calendar events",
  );

  return (
    <div>
      <PageHeader title="Calendar" />
      <CalendarView events={events} month={month} today={todayDateString()} />
    </div>
  );
}
