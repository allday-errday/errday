"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { todayDateString } from "@/lib/dates";
import { initialActionState } from "@/lib/forms";
import { saveSleepLog } from "./actions";

export function SleepForm() {
  const [state, formAction] = useActionState(saveSleepLog, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input
            className={inputClassName()}
            defaultValue={todayDateString()}
            name="date"
            required
            type="date"
          />
        </Field>
        <Field label="Hours">
          <input
            className={inputClassName()}
            max="24"
            min="0"
            name="sleep_hours"
            required
            step="0.1"
            type="number"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quality">
          <select className={inputClassName()} name="quality">
            <option value="">-</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </Field>
        <Field label="Bedtime">
          <input className={inputClassName()} name="bedtime" type="time" />
        </Field>
        <Field label="Wake">
          <input className={inputClassName()} name="wake_time" type="time" />
        </Field>
      </div>

      <Field label="Note">
        <textarea className={inputClassName("min-h-24 py-3")} name="note" />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving sleep...">Save sleep</SubmitButton>
    </form>
  );
}
