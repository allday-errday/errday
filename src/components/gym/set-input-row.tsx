"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { saveWorkoutSet } from "@/app/gym/actions";

type SetInputRowProps = {
  exerciseId: string;
  exerciseName: string;
  nextSetNumber: number;
  workoutId: string;
};

export function SetInputRow({
  exerciseId,
  exerciseName,
  nextSetNumber,
  workoutId,
}: SetInputRowProps) {
  const [state, formAction] = useActionState(saveWorkoutSet, initialActionState);

  return (
    <form action={formAction} className="mt-3 grid gap-3 rounded-lg bg-black/25 p-3">
      <input name="workout_id" type="hidden" value={workoutId} />
      <input name="exercise_id" type="hidden" value={exerciseId} />
      <input name="exercise_name" type="hidden" value={exerciseName} />
      <div className="grid grid-cols-4 gap-2">
        <Field label="Set">
          <input
            className={inputClassName("px-2 text-sm")}
            defaultValue={nextSetNumber}
            min="1"
            name="set_number"
            required
            type="number"
          />
        </Field>
        <Field label="Kg">
          <input
            className={inputClassName("px-2 text-sm")}
            min="0"
            name="weight_kg"
            step="0.5"
            type="number"
          />
        </Field>
        <Field label="Reps">
          <input
            className={inputClassName("px-2 text-sm")}
            min="0"
            name="reps"
            type="number"
          />
        </Field>
        <Field label="RPE">
          <input
            className={inputClassName("px-2 text-sm")}
            max="10"
            min="0"
            name="rpe"
            step="0.5"
            type="number"
          />
        </Field>
      </div>
      <input
        className={inputClassName()}
        name="note"
        placeholder="Set note"
        type="text"
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Adding...">Add Set</SubmitButton>
    </form>
  );
}
