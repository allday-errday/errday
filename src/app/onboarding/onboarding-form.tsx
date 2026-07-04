"use client";

import { ArrowLeft } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { completeOnboarding } from "./actions";

const goals = [
  { value: "lose", label: "Lose weight", detail: "Steady deficit, keep muscle", emoji: "🔥" },
  { value: "maintain", label: "Maintain", detail: "Hold weight, build habits", emoji: "⚖️" },
  { value: "gain", label: "Build up", detail: "Lean surplus, gain strength", emoji: "💪" },
];

const activityLevels = [
  { value: "sedentary", label: "Sedentary", detail: "Desk days, little movement" },
  { value: "light", label: "Light", detail: "Walks, 1–2 sessions a week" },
  { value: "moderate", label: "Moderate", detail: "3–4 sessions a week" },
  { value: "very_active", label: "Very active", detail: "5+ sessions a week" },
  { value: "athlete", label: "Athlete", detail: "Training is the job" },
];

const sexes = [
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
];

const questions = [
  "What's your goal?",
  "How active are you?",
  "What's your sex?",
  "When were you born?",
  "Your body right now",
];

export function OnboardingForm() {
  const [state, formAction] = useActionState(
    completeOnboarding,
    initialActionState,
  );
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [activity, setActivity] = useState("");
  const [sex, setSex] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const totalSteps = questions.length;

  function pick(setter: (value: string) => void, value: string) {
    setter(value);
    window.setTimeout(() => setStep((current) => current + 1), 180);
  }

  return (
    <form action={formAction}>
      {/* Everything collected so far rides along on the final submit. */}
      <input name="goal" type="hidden" value={goal} />
      <input name="activity_level" type="hidden" value={activity} />
      <input name="sex" type="hidden" value={sex} />
      <input name="birthdate" type="hidden" value={birthdate} />

      <div className="mb-6 flex items-center gap-3">
        {step > 0 ? (
          <button
            aria-label="Back"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : null}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">
          {step + 1}/{totalSteps}
        </span>
      </div>

      <div className="[animation:fadeRise_0.3s_ease]" key={step}>
        <h2 className="mb-5 text-xl font-extrabold text-white sm:text-2xl">
          {questions[step]}
        </h2>

        {step === 0 ? (
          <div className="grid gap-3">
            {goals.map((option) => (
              <ChoiceCard
                active={goal === option.value}
                detail={option.detail}
                emoji={option.emoji}
                key={option.value}
                label={option.label}
                onClick={() => pick(setGoal, option.value)}
              />
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-3">
            {activityLevels.map((option) => (
              <ChoiceCard
                active={activity === option.value}
                detail={option.detail}
                key={option.value}
                label={option.label}
                onClick={() => pick(setActivity, option.value)}
              />
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid grid-cols-2 gap-3">
            {sexes.map((option) => (
              <ChoiceCard
                active={sex === option.value}
                centered
                emoji={option.emoji}
                key={option.value}
                label={option.label}
                onClick={() => pick(setSex, option.value)}
              />
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5">
            <input
              aria-label="Birthdate"
              className={`${inputClassName()} text-lg`}
              onChange={(event) => setBirthdate(event.target.value)}
              type="date"
              value={birthdate}
            />
            <button
              className="min-h-12 rounded-xl bg-[var(--accent)] text-sm font-extrabold text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!birthdate}
              onClick={() => setStep(4)}
              type="button"
            >
              Continue
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height cm">
                <input
                  className={inputClassName()}
                  inputMode="decimal"
                  min="1"
                  name="height_cm"
                  required
                  step="0.1"
                  type="number"
                />
              </Field>
              <Field label="Weight kg">
                <input
                  className={inputClassName()}
                  inputMode="decimal"
                  min="1"
                  name="current_weight_kg"
                  required
                  step="0.1"
                  type="number"
                />
              </Field>
            </div>
            <FormMessage state={state} />
            <SubmitButton pendingLabel="Calculating your targets...">
              Set up my day
            </SubmitButton>
            <p className="text-center text-xs leading-5 text-zinc-500">
              Errday calculates your calorie and macro targets from this — you
              can change everything later in Settings.
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function ChoiceCard({
  active,
  centered = false,
  detail,
  emoji,
  label,
  onClick,
}: {
  active: boolean;
  centered?: boolean;
  detail?: string;
  emoji?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-2xl border p-4 transition duration-200 active:scale-[0.98] ${
        centered ? "text-center" : "flex items-center gap-4 text-left"
      } ${
        active
          ? "border-[var(--accent)]/60 bg-[var(--accent-soft)] shadow-lg shadow-[var(--accent)]/10"
          : "border-[var(--border)] bg-[var(--surface-2)]/70 hover:border-[var(--accent)]/30 hover:bg-[var(--surface-3)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {emoji ? (
        <span className={`text-2xl ${centered ? "block" : ""}`}>{emoji}</span>
      ) : null}
      <span className={centered ? "mt-2 block" : "min-w-0"}>
        <span className="block font-extrabold text-white">{label}</span>
        {detail ? (
          <span className="mt-0.5 block text-xs font-semibold text-zinc-500">
            {detail}
          </span>
        ) : null}
      </span>
    </button>
  );
}
