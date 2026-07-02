"use client";

import { useState } from "react";
import { ExerciseThumbnail } from "@/components/gym/exercise-thumbnail";
import { RestTimer } from "@/components/gym/rest-timer";
import { SetInputRow } from "@/components/gym/set-input-row";

type PanelSet = {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
};

type WorkoutExercisePanelProps = {
  defaultExpanded: boolean;
  exerciseId: string | null;
  exerciseName: string;
  imageKey: string | null;
  instructions: string | null;
  nextSetNumber: number;
  sets: PanelSet[];
  targetSets: number;
  workoutId: string;
};

export function WorkoutExercisePanel({
  defaultExpanded,
  exerciseId,
  exerciseName,
  imageKey,
  instructions,
  nextSetNumber,
  sets,
  targetSets,
  workoutId,
}: WorkoutExercisePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const completedSets = sets.filter(
    (set) => set.reps !== null || set.weight_kg !== null,
  ).length;

  return (
    <article>
      <button
        aria-expanded={expanded}
        className="mb-4 flex w-full items-center gap-4 text-left"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <ExerciseThumbnail imageKey={imageKey} name={exerciseName} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-[var(--text)] sm:text-2xl">
            {exerciseName}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {completedSets}/{Math.max(targetSets, completedSets)} sets done
          </p>
        </div>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-zinc-500 transition ${
            expanded ? "rotate-180 border-[var(--accent)]/40 text-[var(--accent)]" : ""
          }`}
        >
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div>
          {instructions ? (
            <p className="mb-4 text-sm leading-6 text-zinc-400">{instructions}</p>
          ) : null}
          <RestTimer />
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 text-xs font-bold uppercase text-zinc-500 sm:grid-cols-[3rem_1fr_1fr_3rem] sm:gap-3">
            <span>Set</span>
            <span className="text-center">Kg</span>
            <span className="text-center">Reps</span>
            <span />
          </div>
          <div className="mt-3 space-y-3">
            {sets.map((set) => (
              <div
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 sm:grid-cols-[3rem_1fr_1fr_3rem] sm:gap-3"
                key={set.id}
              >
                <span className="text-lg font-semibold text-[var(--text)] sm:text-xl">
                  {set.set_number}
                </span>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-3 text-center text-lg font-semibold text-white">
                  {set.weight_kg ?? "-"}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-3 text-center text-lg font-semibold text-white">
                  {set.reps ?? "-"}
                </div>
                <div className="grid size-11 place-items-center rounded-full bg-[var(--signal)]/15 text-[var(--signal)]">
                  <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          <SetInputRow
            exerciseId={exerciseId ?? ""}
            exerciseName={exerciseName}
            nextSetNumber={nextSetNumber}
            workoutId={workoutId}
          />
        </div>
      ) : null}
    </article>
  );
}
