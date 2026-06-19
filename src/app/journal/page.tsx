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

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
          Errday Journal
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          {greeting()}
        </h1>
      </header>

      <JournalCheckin
        defaultContent={todayEntry?.content ?? ""}
        defaultEnergy={todayEntry?.energy ?? null}
        defaultMood={todayEntry?.mood ?? null}
        defaultStress={todayEntry?.stress ?? null}
        hasToday={Boolean(todayEntry)}
      />

      {past.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">
            Past entries
          </h2>
          <div className="space-y-2">
            {past.map((entry) => (
              <article
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                key={entry.id}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {formatDate(entry.date)}
                  </p>
                  <span className="text-lg" aria-hidden="true">
                    {entry.mood ? moodEmoji[entry.mood - 1] : "·"}
                  </span>
                </div>
                {entry.content ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
                    {entry.content}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) {
    return "Still up?";
  }
  if (h < 12) {
    return "Good morning";
  }
  if (h < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}
