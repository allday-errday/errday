"use client";

import { Bell, ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toaster";
import { initialActionState } from "@/lib/forms";
import type { CalendarCategory, CalendarEvent } from "@/types/database";
import { removeCalendarEvent, saveCalendarEvent } from "./actions";

const categoryMeta: Record<
  CalendarCategory,
  { label: string; dot: string; chip: string }
> = {
  workout: {
    label: "Workout",
    dot: "bg-[var(--accent)]",
    chip: "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]",
  },
  meal: {
    label: "Meal",
    dot: "bg-emerald-400",
    chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  },
  sleep: {
    label: "Sleep",
    dot: "bg-sky-400",
    chip: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  },
  reminder: {
    label: "Reminder",
    dot: "bg-amber-400",
    chip: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  },
  general: {
    label: "General",
    dot: "bg-zinc-400",
    chip: "border-white/15 bg-white/[0.06] text-zinc-300",
  },
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function gridDays(month: string) {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - lead);

  const days: { date: string; inMonth: boolean }[] = [];
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const date = current.toISOString().slice(0, 10);
    days.push({ date, inMonth: date.slice(0, 7) === month });
  }

  // Drop a fully out-of-month trailing week.
  if (days.slice(35).every((day) => !day.inMonth)) {
    return days.slice(0, 35);
  }
  return days;
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function formatSelectedDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

type CalendarViewProps = {
  events: CalendarEvent[];
  month: string;
  today: string;
};

export function CalendarView({ events, month, today }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(() =>
    today.slice(0, 7) === month ? today : `${month}-01`,
  );
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => gridDays(month), [month]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  function openCreate() {
    setEditingEvent(null);
    setFormOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingEvent(null);
  }

  function handleDelete(event: CalendarEvent) {
    startDelete(async () => {
      await removeCalendarEvent(event.id);
      toast("✓ Event deleted");
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{monthLabel(month)}</h2>
          <div className="flex items-center gap-1.5">
            <Link
              aria-label="Previous month"
              className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-white/[0.03] text-zinc-400 transition hover:border-white/20 hover:text-white"
              href={`/calendar?month=${shiftMonth(month, -1)}`}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              className="rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-400 transition hover:border-white/20 hover:text-white"
              href="/calendar"
            >
              Today
            </Link>
            <Link
              aria-label="Next month"
              className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-white/[0.03] text-zinc-400 transition hover:border-white/20 hover:text-white"
              href={`/calendar?month=${shiftMonth(month, 1)}`}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((day) => (
            <p
              className="pb-2 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500"
              key={day}
            >
              {day}
            </p>
          ))}
          {days.map(({ date, inMonth }) => {
            const dayEvents = eventsByDate.get(date) ?? [];
            const isSelected = date === selectedDate;
            const isToday = date === today;

            return (
              <button
                aria-label={`${date}, ${dayEvents.length} events`}
                className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border text-sm transition sm:min-h-16 ${
                  isSelected
                    ? "border-[var(--accent)]/60 bg-[var(--accent-soft)] font-bold text-white"
                    : "border-transparent hover:border-white/15 hover:bg-white/[0.04]"
                } ${inMonth ? "text-zinc-200" : "text-zinc-600"}`}
                key={date}
                onClick={() => setSelectedDate(date)}
                type="button"
              >
                <span
                  className={
                    isToday
                      ? "grid size-6 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--on-accent)]"
                      : undefined
                  }
                >
                  {Number(date.slice(8, 10))}
                </span>
                {dayEvents.length > 0 ? (
                  <span className="flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        className={`size-1.5 rounded-full ${categoryMeta[event.category].dot}`}
                        key={event.id}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="h-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              {selectedDate === today ? "Today" : "Selected day"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              {formatSelectedDate(selectedDate)}
            </h2>
          </div>
          <button
            className="flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-bold text-[var(--on-accent)] shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-110"
            onClick={openCreate}
            type="button"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>

        {formOpen ? (
          <EventForm
            defaultDate={selectedDate}
            event={editingEvent}
            key={editingEvent?.id ?? `new-${selectedDate}`}
            onClose={closeForm}
          />
        ) : null}

        <div className="mt-4 space-y-2">
          {selectedEvents.length === 0 && !formOpen ? (
            <p className="rounded-xl border border-dashed border-white/12 px-4 py-6 text-center text-sm leading-6 text-zinc-500">
              Nothing planned yet.
            </p>
          ) : (
            selectedEvents.map((event) => {
              const meta = categoryMeta[event.category];
              return (
                <article
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
                  key={event.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {event.title}
                        </h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-bold ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {event.start_time
                          ? `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ""}`
                          : "All day"}
                      </p>
                      {event.location ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                          <MapPin className="size-3.5" />
                          {event.location}
                        </p>
                      ) : null}
                      {event.reminder_minutes !== null ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                          <Bell className="size-3.5" />
                          {event.reminder_minutes === 0
                            ? "Alert at event time"
                            : `Alert ${event.reminder_minutes} min before`}
                        </p>
                      ) : null}
                      {event.description ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        aria-label={`Edit ${event.title}`}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                        onClick={() => openEdit(event)}
                        type="button"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label={`Delete ${event.title}`}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                        disabled={isDeleting}
                        onClick={() => handleDelete(event)}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function EventForm({
  defaultDate,
  event,
  onClose,
}: {
  defaultDate: string;
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(
    saveCalendarEvent,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      // FormMessage shows the success toast; the form just closes.
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="mt-4 grid gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--surface-2)]/60 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          {event ? "Edit event" : "New event"}
        </h3>
        <button
          aria-label="Close form"
          className="grid size-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      {event ? <input name="event_id" type="hidden" value={event.id} /> : null}

      <Field label="Title">
        <input
          className={inputClassName()}
          defaultValue={event?.title ?? ""}
          name="title"
          placeholder="Push day, meal prep, …"
          required
          type="text"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input
            className={inputClassName()}
            defaultValue={event?.date ?? defaultDate}
            name="date"
            required
            type="date"
          />
        </Field>
        <Field label="Category">
          <select
            className={inputClassName()}
            defaultValue={event?.category ?? "general"}
            name="category"
          >
            {Object.entries(categoryMeta).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start (empty = all day)">
          <input
            className={inputClassName()}
            defaultValue={event?.start_time?.slice(0, 5) ?? ""}
            name="start_time"
            type="time"
          />
        </Field>
        <Field label="End">
          <input
            className={inputClassName()}
            defaultValue={event?.end_time?.slice(0, 5) ?? ""}
            name="end_time"
            type="time"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Reminder">
          <select
            className={inputClassName()}
            defaultValue={
              event?.reminder_minutes === null ||
              event?.reminder_minutes === undefined
                ? ""
                : String(event.reminder_minutes)
            }
            name="reminder_minutes"
          >
            <option value="">No alert</option>
            <option value="0">At event time</option>
            <option value="10">10 min before</option>
            <option value="30">30 min before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </select>
        </Field>
        <Field label="Location">
          <input
            className={inputClassName()}
            defaultValue={event?.location ?? ""}
            name="location"
            placeholder="Gym, kitchen, …"
            type="text"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          className={inputClassName("min-h-20 py-3")}
          defaultValue={event?.description ?? ""}
          name="description"
          placeholder="Optional details"
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">
        {event ? "Save changes" : "Add event"}
      </SubmitButton>
    </form>
  );
}
