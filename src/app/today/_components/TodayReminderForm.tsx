"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { initialActionState } from "@/lib/forms";
import { saveCalendarEvent } from "@/app/calendar/actions";

export function TodayReminderForm({ date }: { date: string }) {
  const [state, formAction] = useActionState(
    saveCalendarEvent,
    initialActionState,
  );

  return (
    <section className="border-t border-[var(--border)] pt-5 sm:pt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold text-white sm:text-xl">Reminders</h2>
      </div>
      <form action={formAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
        <input name="category" type="hidden" value="reminder" />
        <input name="date" type="hidden" value={date} />
        <input name="reminder_minutes" type="hidden" value="0" />
        <input
          aria-label="Reminder"
          className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--accent)]"
          name="title"
          placeholder="What for?"
          required
          type="text"
        />
        <input
          aria-label="Reminder time"
          className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-white outline-none transition focus:border-[var(--accent)]"
          name="start_time"
          required
          type="time"
        />
        <button
          aria-label="Add reminder"
          className="grid min-h-12 place-items-center rounded-xl bg-[var(--accent)] px-4 text-[var(--on-accent)] transition hover:brightness-110"
          title="Add reminder"
          type="submit"
        >
          <Plus className="size-5" />
        </button>
      </form>
      <FormMessage state={state} />
    </section>
  );
}
