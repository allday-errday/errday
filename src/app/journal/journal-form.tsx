"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { todayDateString } from "@/lib/dates";
import { initialActionState } from "@/lib/forms";
import { saveJournalEntry } from "./actions";

export function JournalForm() {
  const [state, formAction] = useActionState(
    saveJournalEntry,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Date">
        <input
          className={inputClassName()}
          defaultValue={todayDateString()}
          name="date"
          required
          type="date"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <RatingSelect label="Mood" name="mood" />
        <RatingSelect label="Energy" name="energy" />
        <RatingSelect label="Stress" name="stress" />
      </div>

      <Field label="Notes">
        <textarea
          className={inputClassName("min-h-36 py-3")}
          name="content"
          placeholder="What stood out today?"
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving journal...">Save journal</SubmitButton>
    </form>
  );
}

function RatingSelect({ label, name }: { label: string; name: string }) {
  return (
    <Field label={label}>
      <select className={inputClassName()} name={name}>
        <option value="">-</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </Field>
  );
}
