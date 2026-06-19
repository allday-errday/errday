"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { todayDateString } from "@/lib/dates";
import { initialActionState } from "@/lib/forms";
import { saveJournalEntry } from "./actions";

const prompts = [
  "What stood out today?",
  "What are you grateful for right now?",
  "What drained you, and what gave you energy?",
  "What would make tomorrow a win?",
  "What did you learn about yourself today?",
  "What is one thing you handled well?",
  "What is on your mind before bed?",
];

const moodEmoji = ["😔", "🙁", "😐", "🙂", "😄"];

type JournalCheckinProps = {
  defaultMood: number | null;
  defaultEnergy: number | null;
  defaultStress: number | null;
  defaultContent: string;
  hasToday: boolean;
};

export function JournalCheckin({
  defaultMood,
  defaultEnergy,
  defaultStress,
  defaultContent,
  hasToday,
}: JournalCheckinProps) {
  const [state, formAction] = useActionState(
    saveJournalEntry,
    initialActionState,
  );
  const [mood, setMood] = useState<number | null>(defaultMood);
  const [energy, setEnergy] = useState<number | null>(defaultEnergy);
  const [stress, setStress] = useState<number | null>(defaultStress);
  const prompt = prompts[new Date().getDate() % prompts.length];

  return (
    <form action={formAction}>
      <input name="date" type="hidden" value={todayDateString()} />
      <input name="mood" type="hidden" value={mood ?? ""} />
      <input name="energy" type="hidden" value={energy ?? ""} />
      <input name="stress" type="hidden" value={stress ?? ""} />

      <div className="rounded-[1.75rem] border border-[var(--border)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          {hasToday ? "Today, revisited" : "Tonight's reflection"}
        </p>
        <p className="mt-2 text-xl font-bold leading-7 text-white">{prompt}</p>

        <textarea
          autoFocus
          className="mt-5 min-h-44 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-base leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[var(--accent)]/70"
          defaultValue={defaultContent}
          name="content"
          placeholder="Let it out..."
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <Scale
          emojis={moodEmoji}
          hint="rough → great"
          label="Mood"
          onSelect={setMood}
          value={mood}
        />
        <Scale
          hint="drained → wired"
          label="Energy"
          onSelect={setEnergy}
          value={energy}
        />
        <Scale
          hint="calm → tense"
          label="Stress"
          onSelect={setStress}
          value={stress}
        />
      </div>

      <div className="mt-4">
        <FormMessage state={state} />
      </div>
      <div className="mt-2">
        <SubmitButton pendingLabel="Saving...">
          {hasToday ? "Update today's entry" : "Save reflection"}
        </SubmitButton>
      </div>
    </form>
  );
}

function Scale({
  emojis,
  hint,
  label,
  onSelect,
  value,
}: {
  emojis?: string[];
  hint: string;
  label: string;
  onSelect: (value: number) => void;
  value: number | null;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              aria-label={`${label} ${n}`}
              aria-pressed={active}
              className={`flex min-h-12 items-center justify-center rounded-xl border text-base font-bold transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-zinc-400 hover:border-[var(--border-strong)] hover:text-zinc-200"
              }`}
              key={n}
              onClick={() => onSelect(n)}
              type="button"
            >
              {emojis ? <span className="text-xl">{emojis[n - 1]}</span> : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
