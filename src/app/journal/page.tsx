import { Flame } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { formatDate, todayDateString } from "@/lib/dates";
import { listJournalEntries } from "@/lib/db/journal";
import { safeRead } from "@/lib/db/safe-read";
import { JournalCheckin } from "./journal-checkin";

const moodEmoji = ["😔", "🙁", "😐", "🙂", "😄"];

export default async function JournalPage() {
  const { supabase, user } = await requireUser();
  const entries = await safeRead(
    listJournalEntries(supabase, user.id),
    [],
    "journal entries",
  );
  const today = todayDateString();
  const todayEntry = entries.find((entry) => entry.date === today) ?? null;
  const past = entries.filter((entry) => entry.date !== today);
  const streak = journalStreak(
    entries.map((entry) => entry.date),
    today,
  );

  return (
    <div>
      <PageHeader
        title="Journal"
        trailing={streak > 0 ? (
          <span className="flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 text-sm font-semibold text-[var(--accent-strong)]">
            <Flame className="size-4" /> {streak} days
          </span>
        ) : null}
      />

      <JournalCheckin
        defaultContent={todayEntry?.content ?? ""}
        defaultEnergy={todayEntry?.energy ?? null}
        defaultMood={todayEntry?.mood ?? null}
        defaultStress={todayEntry?.stress ?? null}
        hasToday={Boolean(todayEntry)}
      />

      <section className="mt-8">
        <p className="apple-section-title">Previous entries</p>
        {past.length > 0 ? (
          <div className="apple-group">
            {past.map((entry) => (
              <article
                className="apple-row group flex gap-4 px-4 py-3 transition hover:bg-[var(--surface-2)]"
                key={entry.id}
              >
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-xl"
                >
                  {entry.mood ? moodEmoji[entry.mood - 1] : "✍️"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold text-white">
                      {formatDate(entry.date)}
                    </p>
                    <MetaDots energy={entry.energy} stress={entry.stress} />
                  </div>
                  {entry.content ? (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-zinc-400">
                      {entry.content}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm italic text-zinc-600">
                      Check-in only — no notes that day.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nothing here yet.</p>
        )}
      </section>
    </div>
  );
}

function MetaDots({
  energy,
  stress,
}: {
  energy: number | null;
  stress: number | null;
}) {
  if (!energy && !stress) return null;

  return (
    <span className="flex shrink-0 gap-2 text-xs font-semibold text-zinc-500">
      {energy ? <span>⚡ {energy}/5</span> : null}
      {stress ? <span>〰 {stress}/5</span> : null}
    </span>
  );
}

/** Consecutive days journaled, counting back from today (or yesterday if
 *  today's entry isn't written yet — an open day doesn't break the run). */
function journalStreak(dates: string[], today: string) {
  const set = new Set(dates);
  const cursor = new Date(`${today}T00:00:00Z`);

  if (!set.has(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
