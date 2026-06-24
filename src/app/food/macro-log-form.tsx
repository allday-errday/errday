"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { saveManualMacroLog } from "./actions";

const mealSlots = [
  { label: "Infer", value: "" },
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
  { label: "Pre-Workout", value: "pre_workout" },
  { label: "Post-Workout", value: "post_workout" },
];

export function MacroLogForm() {
  const [state, formAction] = useActionState(
    saveManualMacroLog,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)]">
        <Field label="Name">
          <input
            className={inputClassName()}
            name="name"
            placeholder="Protein shake, homemade bowl..."
            type="text"
          />
        </Field>

        <Field label="Meal">
          <select className={inputClassName()} name="meal_slot">
            {mealSlots.map((slot) => (
              <option key={slot.value || "infer"} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Amount / note">
        <input
          className={inputClassName()}
          name="amount"
          placeholder="1 serving, 250 g, estimated..."
          type="text"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Field label="Calories">
          <input
            className={inputClassName()}
            min="0"
            name="calories"
            placeholder="auto"
            step="1"
            type="number"
          />
        </Field>

        <Field label="Protein">
          <input
            className={inputClassName()}
            min="0"
            name="protein_g"
            placeholder="0 g"
            step="0.1"
            type="number"
          />
        </Field>

        <Field label="Carbs">
          <input
            className={inputClassName()}
            min="0"
            name="carbs_g"
            placeholder="0 g"
            step="0.1"
            type="number"
          />
        </Field>

        <Field label="Fat">
          <input
            className={inputClassName()}
            min="0"
            name="fat_g"
            placeholder="0 g"
            step="0.1"
            type="number"
          />
        </Field>
      </div>

      <p className="text-xs leading-5 text-zinc-500">
        Leave calories empty if you want Errday to calculate them from
        protein, carbs and fat.
      </p>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Logging macros...">Log macros</SubmitButton>
    </form>
  );
}
