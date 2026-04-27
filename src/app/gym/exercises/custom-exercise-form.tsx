"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { saveCustomExercise } from "../actions";

export function CustomExerciseForm() {
  const [state, formAction] = useActionState(
    saveCustomExercise,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Name">
        <input className={inputClassName()} name="name" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Muscle">
          <select className={inputClassName()} name="primary_muscle" required>
            <option value="Chest">Chest</option>
            <option value="Back">Back</option>
            <option value="Shoulders">Shoulders</option>
            <option value="Arms">Arms</option>
            <option value="Legs">Legs</option>
            <option value="Core">Core</option>
          </select>
        </Field>
        <Field label="Equipment">
          <input
            className={inputClassName()}
            defaultValue="bodyweight"
            name="equipment"
          />
        </Field>
      </div>
      <Field label="Category">
        <input
          className={inputClassName()}
          defaultValue="strength"
          name="category"
        />
      </Field>
      <Field label="Instructions">
        <textarea
          className={inputClassName("min-h-24 py-3")}
          name="instructions"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating...">Create Exercise</SubmitButton>
    </form>
  );
}
