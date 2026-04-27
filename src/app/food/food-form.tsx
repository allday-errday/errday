"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { todayDateString } from "@/lib/dates";
import { initialActionState } from "@/lib/forms";
import { saveFoodEntry } from "./actions";

export function FoodForm() {
  const [state, formAction] = useActionState(saveFoodEntry, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            className={inputClassName()}
            defaultValue={todayDateString()}
            name="date"
            required
            type="date"
          />
        </Field>
        <Field label="Meal">
          <select className={inputClassName()} name="meal_type" required>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </Field>
      </div>

      <Field label="Food name">
        <input
          className={inputClassName()}
          name="name"
          placeholder="Chicken rice bowl"
          required
        />
      </Field>

      <Field label="Amount">
        <input
          className={inputClassName()}
          name="amount"
          placeholder="1 bowl, 250 g, 2 pieces"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories">
          <input className={inputClassName()} min="0" name="calories" required type="number" />
        </Field>
        <Field label="Protein g">
          <input className={inputClassName()} min="0" name="protein_g" step="0.1" type="number" />
        </Field>
        <Field label="Carbs g">
          <input className={inputClassName()} min="0" name="carbs_g" step="0.1" type="number" />
        </Field>
        <Field label="Fat g">
          <input className={inputClassName()} min="0" name="fat_g" step="0.1" type="number" />
        </Field>
      </div>

      <Field label="Note">
        <textarea
          className={inputClassName("min-h-24 py-3")}
          name="note"
          placeholder="Optional"
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Logging meal...">Log meal</SubmitButton>
    </form>
  );
}
