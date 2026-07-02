import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { MuscleFilterChips } from "@/components/gym/muscle-filter-chips";
import { WorkoutExercisePanel } from "@/components/gym/workout-exercise-panel";
import { WorkoutTimer } from "@/components/gym/workout-timer";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { searchExercises } from "@/lib/db/exercises";
import {
  getActiveWorkoutSession,
  getWorkoutWithSets,
} from "@/lib/db/gym";
import {
  addExerciseToCurrentWorkout,
  discardWorkout,
  finishWorkout,
} from "../../actions";

type WorkoutPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    muscle?: string;
    q?: string;
  }>;
};

export default async function WorkoutPage({
  params,
  searchParams,
}: WorkoutPageProps) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireUser();
  const [workout, activeSession] = await Promise.all([
    getWorkoutWithSets(supabase, user.id, id),
    getActiveWorkoutSession(supabase, user.id),
  ]);

  if (!workout) {
    notFound();
  }

  const isActive = activeSession?.workout_id === workout.id;
  const startedAt = isActive ? activeSession.started_at : workout.created_at;
  const totalSets = workout.workout_sets.length;
  const volume = workout.workout_sets.reduce((sum, set) => {
    return sum + Number(set.weight_kg ?? 0) * Number(set.reps ?? 0);
  }, 0);
  const muscle = search.muscle ?? "All";
  const query = search.q ?? "";
  const library = await searchExercises(supabase, user.id, query, { muscle });

  return (
    <div>
      <header className="sticky top-16 z-20 -mx-4 mb-5 border-y border-[var(--border)] bg-[var(--bg-soft)]/95 px-4 py-3 backdrop-blur-xl sm:top-20 lg:top-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="grid size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--surface-2)]"
            href="/gym"
            aria-label="Back to gym"
          >
            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2 2" />
              <path d="M9 2h6" />
            </svg>
            <WorkoutTimer startedAt={startedAt} />
          </div>
          {isActive ? (
            <div className="grid basis-full grid-cols-2 gap-2 sm:basis-auto sm:flex sm:items-center">
              <form action={discardWorkout}>
                <input name="workout_id" type="hidden" value={workout.id} />
                <input name="session_id" type="hidden" value={activeSession.id} />
                <button
                  className="min-h-12 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                  type="submit"
                >
                  Discard
                </button>
              </form>
              <form action={finishWorkout}>
                <input name="session_id" type="hidden" value={activeSession.id} />
                <SubmitButton pendingLabel="Finishing...">Finish</SubmitButton>
              </form>
            </div>
          ) : (
            <Link
              className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-bold text-black"
              href="/gym/history"
            >
              Done
            </Link>
          )}
        </div>
      </header>

      <section className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
          <WorkoutMetric
            label="Duration"
            value={<WorkoutTimer startedAt={startedAt} />}
          />
          <WorkoutMetric label="Volume" value={`${Math.round(volume)} kg`} />
          <WorkoutMetric label="Sets" value={`${totalSets}`} />
        </div>
      </section>

      <section className="space-y-8">
        {workout.workout_exercises.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
            <p className="text-sm leading-6 text-zinc-400">
              No exercises yet. Use Add Exercises to build this workout.
            </p>
          </div>
        ) : (
          workout.workout_exercises.map((workoutExercise, index) => {
            const exercise = workoutExercise.exercises;
            const sets = workout.workout_sets
              .filter((set) => set.exercise_id === workoutExercise.exercise_id)
              .map((set) => ({
                id: set.id,
                set_number: set.set_number,
                weight_kg: set.weight_kg === null ? null : Number(set.weight_kg),
                reps: set.reps,
              }));
            const nextSetNumber =
              Math.max(0, ...sets.map((set) => set.set_number)) + 1;

            return (
              <WorkoutExercisePanel
                defaultExpanded={index === 0}
                exerciseId={workoutExercise.exercise_id}
                exerciseName={exercise?.name ?? "Exercise"}
                imageKey={exercise?.image_key ?? null}
                instructions={exercise?.instructions ?? null}
                key={workoutExercise.id}
                nextSetNumber={nextSetNumber}
                sets={sets}
                targetSets={workoutExercise.target_sets}
                workoutId={workout.id}
              />
            );
          })
        )}
      </section>

      <section
        className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20"
        id="add-exercises"
      >
        <h2 className="text-xl font-bold text-white">Add Exercises</h2>
        <form className="mt-4">
          <input
            className="min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-base text-white outline-none focus:border-[var(--accent)]"
            defaultValue={query}
            name="q"
            placeholder="Search exercises"
          />
          {muscle !== "All" ? <input name="muscle" type="hidden" value={muscle} /> : null}
        </form>
        <div className="mt-4">
          <MuscleFilterChips
            basePath={`/gym/workout/${workout.id}`}
            current={muscle}
            query={query}
          />
        </div>
        <div className="mt-4 space-y-3">
          {library.map((exercise) => (
            <form action={addExerciseToCurrentWorkout} key={exercise.id}>
              <input name="workout_id" type="hidden" value={workout.id} />
              <input name="exercise_id" type="hidden" value={exercise.id} />
              <button className="w-full" type="submit">
                <ExerciseRow
                  equipment={exercise.equipment}
                  imageKey={exercise.image_key}
                  name={exercise.name}
                  primaryMuscle={exercise.primary_muscle}
                />
              </button>
            </form>
          ))}
        </div>
      </section>

    </div>
  );
}

function WorkoutMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="px-2">
      <p className="text-sm text-zinc-500">{label}</p>
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
    </div>
  );
}
