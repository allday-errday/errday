import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { ExerciseThumbnail } from "@/components/gym/exercise-thumbnail";
import { MuscleFilterChips } from "@/components/gym/muscle-filter-chips";
import { SetInputRow } from "@/components/gym/set-input-row";
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
    <div className="gym-screen -mx-4 -mt-[calc(1.25rem+env(safe-area-inset-top))] min-h-dvh bg-white px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="sticky top-0 z-20 -mx-4 mb-5 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="grid size-11 place-items-center rounded-full text-3xl leading-none text-[#0b0b10]"
            href="/gym"
            aria-label="Back to gym"
          >
            v
          </Link>
          <div className="flex items-center gap-2 text-[#d946ef]">
            <span className="text-2xl">o</span>
            <WorkoutTimer startedAt={startedAt} />
          </div>
          {isActive ? (
            <div className="flex items-center gap-2">
              <form action={discardWorkout}>
                <input name="workout_id" type="hidden" value={workout.id} />
                <input name="session_id" type="hidden" value={activeSession.id} />
                <button
                  className="min-h-12 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
              className="rounded-full bg-[#d946ef] px-4 py-3 text-sm font-black text-black"
              href="/gym/history"
            >
              Done
            </Link>
          )}
        </div>
      </header>

      <section className="mb-7 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
        <div className="grid grid-cols-3 divide-x divide-zinc-200 text-center">
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
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
            <p className="text-sm leading-6 text-zinc-400">
              No exercises yet. Use Add Exercises to build this workout.
            </p>
          </div>
        ) : (
          workout.workout_exercises.map((workoutExercise, index) => {
            const exercise = workoutExercise.exercises;
            const sets = workout.workout_sets.filter(
              (set) => set.exercise_id === workoutExercise.exercise_id,
            );
            const completedSets = sets.filter(
              (set) => set.reps !== null || set.weight_kg !== null,
            ).length;
            const nextSetNumber =
              Math.max(0, ...sets.map((set) => set.set_number)) + 1;
            const isExpanded = index === 0;

            return (
              <article key={workoutExercise.id}>
                <div className="mb-4 flex items-center gap-4">
                  <ExerciseThumbnail
                    imageKey={exercise?.image_key}
                    name={exercise?.name ?? "Exercise"}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-2xl font-semibold text-[#0b0b10]">
                      {exercise?.name ?? "Exercise"}
                    </h2>
                    {isExpanded ? (
                      <p className="mt-3 text-base text-[#0b0b10]">
                        {exercise?.instructions ?? "Track clean reps and weight."}
                      </p>
                    ) : (
                      <p className="mt-1 text-base text-zinc-500">
                        {completedSets}/{workoutExercise.target_sets} Done
                      </p>
                    )}
                  </div>
                  <div className="text-2xl font-black text-[#d946ef]">...</div>
                </div>

                {isExpanded ? (
                  <div>
                    <p className="mb-5 text-lg font-semibold text-[#d946ef]">
                      Rest Timer: 2min
                    </p>
                    <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-3 text-xs font-bold uppercase text-zinc-500">
                      <span>Set</span>
                      <span className="text-center">Kg</span>
                      <span className="text-center">Reps</span>
                      <span />
                    </div>
                    <div className="mt-3 space-y-3">
                      {sets.map((set) => (
                        <div
                          className="grid grid-cols-[3rem_1fr_1fr_3rem] items-center gap-3"
                          key={set.id}
                        >
                          <span className="text-2xl font-semibold text-[#0b0b10]">
                            {set.set_number}
                          </span>
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-3 text-center text-xl font-semibold text-zinc-900">
                            {set.weight_kg ?? "-"}
                          </div>
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-3 text-center text-xl font-semibold text-zinc-900">
                            {set.reps ?? "-"}
                          </div>
                          <div className="grid size-12 place-items-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                            OK
                          </div>
                        </div>
                      ))}
                    </div>
                    <SetInputRow
                      exerciseId={workoutExercise.exercise_id}
                      exerciseName={exercise?.name ?? "Exercise"}
                      nextSetNumber={nextSetNumber}
                      workoutId={workout.id}
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      <section
        className="mt-10 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70"
        id="add-exercises"
      >
        <h2 className="text-xl font-black text-zinc-900">Add Exercises</h2>
        <form className="mt-4">
          <input
            className="min-h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-base text-zinc-900 outline-none focus:border-[#d946ef]"
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

      <a
        className="fixed inset-x-5 bottom-[calc(6.2rem+env(safe-area-inset-bottom))] z-30 mx-auto flex min-h-16 max-w-sm items-center justify-center rounded-full bg-zinc-900 text-lg font-black text-white shadow-xl shadow-zinc-300/60"
        href="#add-exercises"
      >
        Add Exercises
      </a>
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
      <div className="mt-2 text-xl font-black text-zinc-900">{value}</div>
    </div>
  );
}
