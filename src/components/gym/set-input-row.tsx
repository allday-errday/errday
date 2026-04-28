"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { initialActionState } from "@/lib/forms";
import { saveWorkoutSet } from "@/app/gym/actions";

type SetInputRowProps = {
  exerciseId: string;
  exerciseName: string;
  nextSetNumber: number;
  workoutId: string;
};

const inputClassName =
  "h-12 w-full rounded-none border border-white/10 bg-[#050505] px-2 text-center text-lg font-semibold text-white outline-none transition placeholder:text-zinc-700 focus:border-[#22c55e]";

export function SetInputRow({
  exerciseId,
  exerciseName,
  nextSetNumber,
  workoutId,
}: SetInputRowProps) {
  const [state, formAction] = useActionState(saveWorkoutSet, initialActionState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input name="workout_id" type="hidden" value={workoutId} />
      <input name="exercise_id" type="hidden" value={exerciseId} />
      <input name="exercise_name" type="hidden" value={exerciseName} />
      <div className="grid grid-cols-[3rem_1fr_1fr_3rem] items-end gap-3">
        <label className="grid gap-2 text-xs font-bold uppercase text-zinc-500">
          Set
          <input
            className={inputClassName}
            defaultValue={nextSetNumber}
            min="1"
            name="set_number"
            required
            type="number"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase text-zinc-500">
          Kg
          <input
            className={inputClassName}
            min="0"
            name="weight_kg"
            placeholder="0"
            step="0.5"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase text-zinc-500">
          Reps
          <input
            className={inputClassName}
            min="0"
            name="reps"
            placeholder="0"
            type="number"
          />
        </label>
        <button
          className="grid h-12 place-items-center rounded-full bg-[#252525] text-2xl font-black text-white"
          type="submit"
          aria-label="Add set"
        >
          OK
        </button>
      </div>
      <input name="rpe" type="hidden" value="" />
      <input name="note" type="hidden" value="" />
      <FormMessage state={state} />
    </form>
  );
}
