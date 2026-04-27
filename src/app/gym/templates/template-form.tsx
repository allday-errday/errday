"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { saveWorkoutTemplate } from "../actions";

export function TemplateForm() {
  const [state, formAction] = useActionState(
    saveWorkoutTemplate,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Name">
        <input
          className={inputClassName()}
          name="name"
          placeholder="Push Day"
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          className={inputClassName("min-h-24 py-3")}
          name="description"
          placeholder="Chest, shoulders, triceps"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating...">Create Template</SubmitButton>
    </form>
  );
}
