"use client";

import {
  Apple,
  Beef,
  Droplets,
  Footprints,
  Moon,
  Wheat,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import {
  dailyScoreInsightOptions,
  normalizeDailyScoreInsights,
  type DailyScoreInsightKey,
} from "@/lib/daily-flow/score-insights";
import { initialActionState } from "@/lib/forms";
import type { DailyProfile } from "@/types/database";
import { saveDailyScoreSettings } from "./actions";

const insightIcons = {
  calories: Apple,
  protein: Beef,
  carbs: Wheat,
  steps: Footprints,
  water: Droplets,
  sleep: Moon,
};

export function DailyScoreSettingsForm({
  dailyProfile,
}: {
  dailyProfile: DailyProfile | null;
}) {
  const [state, formAction] = useActionState(
    saveDailyScoreSettings,
    initialActionState,
  );
  const initialSelection = useMemo(
    () => normalizeDailyScoreInsights(dailyProfile?.daily_score_insights),
    [dailyProfile?.daily_score_insights],
  );
  const [selected, setSelected] = useState<DailyScoreInsightKey[]>(initialSelection);
  const selectionMessage =
    selected.length === 3 ? "3 of 3 selected" : `Choose ${3 - selected.length} more`;

  function toggleInsight(key: DailyScoreInsightKey) {
    setSelected((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      return current.length >= 3 ? current : [...current, key];
    });
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Choose three values</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            These appear below your Daily Score.
          </p>
        </div>
        <p className={`shrink-0 text-sm font-semibold ${selected.length === 3 ? "text-emerald-300" : "text-amber-300"}`}>
          {selectionMessage}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {dailyScoreInsightOptions.map((option) => {
          const Icon = insightIcons[option.key];
          const isSelected = selected.includes(option.key);

          return (
            <button
              aria-pressed={isSelected}
              className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-zinc-300"
              }`}
              key={option.key}
              onClick={() => toggleInsight(option.key)}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className={`size-4 ${isSelected ? "text-[var(--accent)]" : "text-zinc-500"}`}
              />
              {option.label}
              <span
                aria-hidden="true"
                className={`ml-auto size-4 rounded-full border ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]"
                    : "border-zinc-500"
                }`}
              />
            </button>
          );
        })}
      </div>

      {selected.map((value) => (
        <input key={value} name="daily_score_insights" type="hidden" value={value} />
      ))}

      <FormMessage state={state} />
      <SubmitButton cooldownMs={0} disabled={selected.length !== 3} pendingLabel="Saving...">
        Save Daily Score
      </SubmitButton>
    </form>
  );
}
