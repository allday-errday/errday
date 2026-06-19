import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listJournalEntries } from "@/lib/db/journal";
import { JournalForm } from "./journal-form";

export default async function JournalPage() {
  const { supabase, user } = await requireUser();
  const entries = await listJournalEntries(supabase, user.id);

  return (
    <div>
      <PageHeader
        subtitle="Reflect on mood, energy, stress and notes."
        title="Journal"
      />

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Today&apos;s Check-in
        </h2>
        <JournalForm />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Latest Entries</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No journal entries yet. Add a quick reflection above.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <article
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
                key={entry.id}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">
                    {formatDate(entry.date)}
                  </p>
                  <p className="text-sm text-[var(--accent)]">
                    Mood {entry.mood ?? "-"} / 5
                  </p>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Energy {entry.energy ?? "-"} · Stress {entry.stress ?? "-"}
                </p>
                {entry.content ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {entry.content}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
