"use client";

import { Shuffle } from "lucide-react";
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
const energyEmoji = ["🪫", "😴", "😌", "⚡", "🚀"];
const stressEmoji = ["🧘", "😌", "😬", "😣", "🤯"];

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
  const [promptIndex, setPromptIndex] = useState(
    () => new Date().getDate() % prompts.length,
  );

  return (
    <form action={formAction}>
      <input name="date" type="hidden" value={todayDateString()} />
      <input name="mood" type="hidden" value={mood ?? ""} />
      <input name="energy" type="hidden" value={energy ?? ""} />
      <input name="stress" type="hidden" value={stress ?? ""} />

      <div className="surface-panel overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow">
              {hasToday ? "Today, revisited" : "Tonight's reflection"}
            </p>
            <button
              aria-label="New prompt"
              className="flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs font-bold text-zinc-500 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
              onClick={() =>
                setPromptIndex((current) => (current + 1) % prompts.length)
              }
              type="button"
            >
              <Shuffle className="size-3.5" />
              New prompt
            </button>
          </div>
          <p
            className="mt-3 text-2xl font-extrabold leading-snug text-white [animation:fadeRise_0.25s_ease]"
            key={promptIndex}
          >
            {prompts[promptIndex]}
          </p>

          <textarea
            autoFocus
            className="mt-5 min-h-44 w-full resize-none bg-transparent text-lg leading-8 text-[var(--text)] outline-none focus-visible:outline-none placeholder:text-zinc-600"
            defaultValue={defaultContent}
            name="content"
            placeholder="Let it out — no one else can read this..."
          />
        </div>

        <div className="space-y-5 border-t border-[var(--border)] p-5 sm:p-7">
          <EmojiScale
            emojis={moodEmoji}
            label="Mood"
            onSelect={setMood}
            value={mood}
          />
          <EmojiScale
            emojis={energyEmoji}
            label="Energy"
            onSelect={setEnergy}
            value={energy}
          />
          <EmojiScale
            emojis={stressEmoji}
            label="Stress"
            onSelect={setStress}
            value={stress}
          />
        </div>

        <div className="border-t border-[var(--border)] p-5 sm:px-7">
          <FormMessage state={state} />
          <div className="grid">
            <SubmitButton pendingLabel="Saving...">
              {hasToday ? "Update today's entry" : "Save reflection"}
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}

function EmojiScale({
  emojis,
  label,
  onSelect,
  value,
}: {
  emojis: string[];
  label: string;
  onSelect: (value: number) => void;
  value: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="w-16 shrink-0 text-sm font-bold text-zinc-400">
        {label}
      </span>
      <div className="flex flex-1 justify-between gap-1 sm:justify-end sm:gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              aria-label={`${label} ${n} of 5`}
              aria-pressed={active}
              className={`grid size-11 place-items-center rounded-full text-xl transition duration-200 sm:size-12 ${
                active
                  ? "scale-110 bg-[var(--accent-soft)] shadow-lg shadow-[var(--accent)]/20 ring-2 ring-[var(--accent)]"
                  : "opacity-45 grayscale hover:opacity-100 hover:grayscale-0 active:scale-95"
              }`}
              key={n}
              onClick={() => onSelect(n)}
              type="button"
            >
              {emojis[n - 1]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
