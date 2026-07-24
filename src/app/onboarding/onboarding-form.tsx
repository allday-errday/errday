"use client";

import { ArrowLeft } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { completeOnboarding } from "./actions";

const goals = [
  { value: "lose", label: "Lose weight", detail: "A steady calorie deficit" },
  { value: "maintain", label: "Maintain", detail: "Keep your current weight" },
  { value: "gain", label: "Build up", detail: "Gain weight and strength" },
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
  "Your details",
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
        <h2 className="mb-5 text-xl font-bold text-white sm:text-2xl">
          {questions[step]}
        </h2>

        {step === 0 ? (
          <div className="grid gap-3">
            {goals.map((option) => (
              <ChoiceCard
                active={goal === option.value}
                detail={option.detail}
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
          <BirthdateStep
            birthdate={birthdate}
            onContinue={() => setStep(4)}
            setBirthdate={setBirthdate}
          />
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
            <p className="text-center text-xs leading-5 text-zinc-500">You can change this later in Profile.</p>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function BirthdateStep({
  birthdate,
  onContinue,
  setBirthdate,
}: {
  birthdate: string;
  onContinue: () => void;
  setBirthdate: (value: string) => void;
}) {
  const [day, setDay] = useState(birthdate ? birthdate.slice(8, 10) : "");
  const [month, setMonth] = useState(birthdate ? birthdate.slice(5, 7) : "");
  const [year, setYear] = useState(birthdate ? birthdate.slice(0, 4) : "");
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  function compose(d: string, m: string, y: string) {
    const dayNum = Number(d);
    const monthNum = Number(m);
    const yearNum = Number(y);
    const currentYear = new Date().getFullYear();

    if (
      d.length < 1 ||
      m.length < 1 ||
      y.length !== 4 ||
      dayNum < 1 ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900 ||
      yearNum > currentYear
    ) {
      setBirthdate("");
      return;
    }

    // Reject impossible dates like 31.02.
    const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (
      date.getUTCFullYear() !== yearNum ||
      date.getUTCMonth() !== monthNum - 1 ||
      date.getUTCDate() !== dayNum
    ) {
      setBirthdate("");
      return;
    }

    setBirthdate(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
    );
  }

  function handle(
    raw: string,
    maxLength: number,
    setter: (value: string) => void,
    next?: React.RefObject<HTMLInputElement | null>,
  ) {
    const value = raw.replace(/\D/g, "").slice(0, maxLength);
    setter(value);
    if (value.length === maxLength) {
      next?.current?.focus();
    }
    return value;
  }

  const boxClassName =
    "min-h-16 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center text-2xl font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--accent)]";

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-3">
        <label className="grid gap-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
          Day
          <input
            autoFocus
            className={boxClassName}
            inputMode="numeric"
            onChange={(event) => {
              const value = handle(event.target.value, 2, setDay, monthRef);
              compose(value, month, year);
            }}
            placeholder="17"
            value={day}
          />
        </label>
        <label className="grid gap-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
          Month
          <input
            className={boxClassName}
            inputMode="numeric"
            onChange={(event) => {
              const value = handle(event.target.value, 2, setMonth, yearRef);
              compose(day, value, year);
            }}
            placeholder="04"
            ref={monthRef}
            value={month}
          />
        </label>
        <label className="grid gap-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
          Year
          <input
            className={boxClassName}
            inputMode="numeric"
            onChange={(event) => {
              const value = handle(event.target.value, 4, setYear);
              compose(day, month, value);
            }}
            placeholder="2001"
            ref={yearRef}
            value={year}
          />
        </label>
      </div>
      <button
        className="min-h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!birthdate}
        onClick={onContinue}
        type="button"
      >
        Continue
      </button>
    </div>
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
      className={`rounded-lg border p-4 transition ${
        centered ? "text-center" : "flex items-center gap-4 text-left"
      } ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--border)] bg-[var(--surface-2)]/70 hover:border-[var(--accent)]/30 hover:bg-[var(--surface-3)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {emoji ? (
        <span className={`text-2xl ${centered ? "block" : ""}`}>{emoji}</span>
      ) : null}
      <span className={centered ? "mt-2 block" : "min-w-0"}>
        <span className="block font-bold text-white">{label}</span>
        {detail ? (
          <span className="mt-0.5 block text-xs font-semibold text-zinc-500">
            {detail}
          </span>
        ) : null}
      </span>
      {!centered ? (
        <span className={`ml-auto grid size-6 shrink-0 place-items-center rounded-full border ${active ? "border-[var(--accent)] bg-[var(--accent)]" : "border-white/25"}`}>
          {active ? <span className="size-2 rounded-full bg-[var(--on-accent)]" /> : null}
        </span>
      ) : null}
    </button>
  );
}
