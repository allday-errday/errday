"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import type { FoodItem } from "@/types/database";
import { saveFoodLog } from "./actions";

type FoodFormProps = {
  items: FoodItem[];
};

export function FoodForm({ items }: FoodFormProps) {
  const [state, formAction] = useActionState(saveFoodLog, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Food item">
        <select className={inputClassName()} name="food_item_id" required>
          <option value="">Select food</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.calories_per_serving} kcal
            </option>
          ))}
        </select>
      </Field>

      <Field label="Servings">
        <input
          className={inputClassName()}
          defaultValue="1"
          min="0.25"
          name="servings"
          required
          step="0.25"
          type="number"
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Logging meal...">Log meal</SubmitButton>
    </form>
  );
}
