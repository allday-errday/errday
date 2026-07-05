"use client";

import { useActionState, useEffect } from "react";
import { FormMessage } from "@/components/form-message";
import { SET_LOGGED_EVENT } from "@/components/gym/rest-timer";
import { initialActionState } from "@/lib/forms";
import { saveWorkoutSet } from "@/app/gym/actions";

type SetInputRowProps = {
  exerciseId: string;
  exerciseName: string;
  nextSetNumber: number;
  workoutId: string;
};

const cellClassName =
  "h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-1.5 text-center text-base font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-[var(--accent)] sm:h-12 sm:px-2 sm:text-lg";

export function SetInputRow({
  exerciseId,
  exerciseName,
  nextSetNumber,
  workoutId,
}: SetInputRowProps) {
  const [state, formAction] = useActionState(saveWorkoutSet, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      window.dispatchEvent(new Event(SET_LOGGED_EVENT));
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <input name="workout_id" type="hidden" value={workoutId} />
      <input name="exercise_id" type="hidden" value={exerciseId} />
      <input name="exercise_name" type="hidden" value={exerciseName} />
      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-1.5 sm:grid-cols-[3rem_1fr_1fr_3rem] sm:gap-3">
        <input
          aria-label="Set number"
          className={cellClassName}
          defaultValue={nextSetNumber}
          min="1"
          name="set_number"
          required
          type="number"
        />
        <input
          aria-label="Weight in kg"
          className={cellClassName}
          min="0"
          name="weight_kg"
          placeholder="0"
          step="0.5"
          type="number"
        />
        <input
          aria-label="Reps"
          className={cellClassName}
          min="0"
          name="reps"
          placeholder="0"
          type="number"
        />
        <button
          aria-label="Add set"
          className="grid size-10 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)] sm:size-12 sm:text-sm"
          type="submit"
        >
          OK
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
