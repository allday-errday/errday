"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import type { WorkoutTemplate } from "@/types/database";
import { logWorkoutTemplate } from "./actions";

type WorkoutLogFormProps = {
  templates: WorkoutTemplate[];
};

export function WorkoutLogForm({ templates }: WorkoutLogFormProps) {
  const [state, formAction] = useActionState(
    logWorkoutTemplate,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Workout">
        <select className={inputClassName()} name="template_id" required>
          <option value="">Select workout</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} - {template.estimated_minutes} min
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Minutes">
          <input
            className={inputClassName()}
            min="0"
            name="duration_minutes"
            placeholder="Auto"
            type="number"
          />
        </Field>
        <Field label="Calories">
          <input
            className={inputClassName()}
            min="0"
            name="calories_burned"
            placeholder="Auto"
            type="number"
          />
        </Field>
      </div>
      <Field label="Notes">
        <input
          className={inputClassName()}
          name="notes"
          placeholder="Optional"
          type="text"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Logging workout...">Log workout</SubmitButton>
    </form>
  );
}
