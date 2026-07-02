"use client";

import { useActionState, useState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { completeOnboarding } from "./actions";

const goals = [
  {
    value: "lose",
    label: "Lose weight",
    detail: "Steady deficit, keep muscle",
  },
  {
    value: "maintain",
    label: "Maintain",
    detail: "Hold weight, build habits",
  },
  {
    value: "gain",
    label: "Build up",
    detail: "Lean surplus, gain strength",
  },
];

const activityLevels = [
  { value: "sedentary", label: "Sedentary", detail: "Desk days, little movement" },
  { value: "light", label: "Light", detail: "Walks, 1–2 sessions a week" },
  { value: "moderate", label: "Moderate", detail: "3–4 sessions a week" },
  { value: "very_active", label: "Very active", detail: "5+ sessions a week" },
  { value: "athlete", label: "Athlete", detail: "Training is the job" },
];

export function OnboardingForm() {
  const [state, formAction] = useActionState(
    completeOnboarding,
    initialActionState,
  );
  const [goal, setGoal] = useState("maintain");

  return (
    <form action={formAction} className="grid gap-6">
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-zinc-300">
          What&apos;s your goal?
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {goals.map((option) => (
            <label
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                goal === option.value
                  ? "border-[var(--accent)]/60 bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]/70 hover:bg-[var(--surface-3)]"
              }`}
              key={option.value}
            >
              <input
                checked={goal === option.value}
                className="sr-only"
                name="goal"
                onChange={() => setGoal(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="block font-extrabold text-white">
                {option.label}
              </span>
              <span className="mt-1 block text-xs font-semibold text-zinc-500">
                {option.detail}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="How active are you?">
        <select className={inputClassName()} defaultValue="moderate" name="activity_level" required>
          {activityLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label} — {level.detail}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sex">
          <select className={inputClassName()} defaultValue="" name="sex" required>
            <option value="" disabled>
              Select
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Birthdate">
          <input className={inputClassName()} name="birthdate" required type="date" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Height cm">
          <input className={inputClassName()} min="1" name="height_cm" required step="0.1" type="number" />
        </Field>
        <Field label="Weight kg">
          <input className={inputClassName()} min="1" name="current_weight_kg" required step="0.1" type="number" />
        </Field>
      </div>

      {goal !== "maintain" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target weight kg (optional)">
            <input className={inputClassName()} min="1" name="target_weight_kg" step="0.1" type="number" />
          </Field>
          <Field label="Pace kg/week (optional)">
            <input className={inputClassName()} min="0" max="1.5" name="target_rate_kg_per_week" step="0.05" type="number" placeholder="0.35" />
          </Field>
        </div>
      ) : null}

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Calculating your targets...">
        Set up my day
      </SubmitButton>
      <p className="text-center text-xs leading-5 text-zinc-500">
        Errday calculates your calorie and macro targets from this — you can
        change everything later in Settings.
      </p>
    </form>
  );
}
