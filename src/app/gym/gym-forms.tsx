"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { todayDateString } from "@/lib/dates";
import { initialActionState } from "@/lib/forms";
import type { WorkoutWithSets } from "@/types/database";
import { saveWorkout, saveWorkoutSet } from "./actions";

type GymFormsProps = {
  workouts: WorkoutWithSets[];
};

export function WorkoutForm() {
  const [state, formAction] = useActionState(saveWorkout, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            className={inputClassName()}
            defaultValue={todayDateString()}
            name="date"
            required
            type="date"
          />
        </Field>
        <Field label="Workout">
          <input
            className={inputClassName()}
            name="name"
            placeholder="Push Day"
            required
          />
        </Field>
      </div>
      <Field label="Note">
        <textarea className={inputClassName("min-h-24 py-3")} name="note" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating...">Create workout</SubmitButton>
    </form>
  );
}

export function WorkoutSetForm({ workouts }: GymFormsProps) {
  const [state, formAction] = useActionState(saveWorkoutSet, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Workout">
        <select className={inputClassName()} name="workout_id" required>
          <option value="" disabled>
            Select workout
          </option>
          {workouts.map((workout) => (
            <option key={workout.id} value={workout.id}>
              {workout.name} · {workout.date}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Exercise">
        <input
          className={inputClassName()}
          name="exercise_name"
          placeholder="Bench press"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Set">
          <input
            className={inputClassName()}
            min="1"
            name="set_number"
            required
            type="number"
          />
        </Field>
        <Field label="Reps">
          <input className={inputClassName()} min="0" name="reps" type="number" />
        </Field>
        <Field label="Weight kg">
          <input
            className={inputClassName()}
            min="0"
            name="weight_kg"
            step="0.5"
            type="number"
          />
        </Field>
        <Field label="RPE">
          <input
            className={inputClassName()}
            max="10"
            min="0"
            name="rpe"
            step="0.5"
            type="number"
          />
        </Field>
      </div>
      <Field label="Note">
        <input className={inputClassName()} name="note" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Adding set...">Add set</SubmitButton>
    </form>
  );
}
