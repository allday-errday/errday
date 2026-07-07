"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { DailyPlanSlot } from "@/lib/daily-flow/types";
import { defaultPlanTimes, planTimeFields } from "@/lib/daily-flow/plan-times";
import { initialActionState } from "@/lib/forms";
import { savePlanTimes } from "./actions";

type PlanTimesFormProps = {
  times: Partial<Record<DailyPlanSlot, string>>;
};

export function PlanTimesForm({ times }: PlanTimesFormProps) {
  const [state, formAction] = useActionState(savePlanTimes, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {planTimeFields.map(({ label, slot }) => (
          <Field key={slot} label={label}>
            <input
              className={inputClassName()}
              defaultValue={times[slot] ?? defaultPlanTimes[slot]}
              name={slot}
              required
              type="time"
            />
          </Field>
        ))}
      </div>
      <p className="text-xs leading-5 text-zinc-600">
        These times shape the &ldquo;day, mapped out&rdquo; timeline on Today.
        Saved on this device.
      </p>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save plan times</SubmitButton>
    </form>
  );
}
