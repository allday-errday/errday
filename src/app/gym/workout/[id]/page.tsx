import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseRow } from "@/components/gym/exercise-row";
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
import { addExerciseToCurrentWorkout, finishWorkout } from "../../actions";

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

  const startedAt = activeSession?.workout_id === workout.id
    ? activeSession.started_at
    : workout.created_at;
  const muscle = search.muscle ?? "All";
  const query = search.q ?? "";
  const library = await searchExercises(supabase, user.id, query, { muscle });

  return (
    <div className="-mx-4 -mt-[calc(1.25rem+env(safe-area-inset-top))] min-h-dvh bg-[#050505] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="sticky top-0 z-20 -mx-4 mb-5 border-b border-white/10 bg-[#050505]/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm font-bold text-zinc-400" href="/gym">
            Back
          </Link>
          <WorkoutTimer startedAt={startedAt} />
          {activeSession?.workout_id === workout.id ? (
            <form action={finishWorkout}>
              <input name="session_id" type="hidden" value={activeSession.id} />
              <SubmitButton pendingLabel="Finishing...">Finish</SubmitButton>
            </form>
          ) : (
            <Link className="text-sm font-bold text-[#22c55e]" href="/gym/history">
              Done
            </Link>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-black text-white">{workout.name}</h1>
      </header>

      <section className="space-y-4">
        {workout.workout_exercises.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#151515] p-5">
            <p className="text-sm leading-6 text-zinc-400">
              No exercises yet. Use Add Exercises to build this workout.
            </p>
          </div>
        ) : (
          workout.workout_exercises.map((workoutExercise) => {
            const exercise = workoutExercise.exercises;
            const sets = workout.workout_sets.filter(
              (set) => set.exercise_id === workoutExercise.exercise_id,
            );
            const completedSets = sets.filter(
              (set) => set.reps !== null || set.weight_kg !== null,
            ).length;
            const nextSetNumber =
              Math.max(0, ...sets.map((set) => set.set_number)) + 1;

            return (
              <article
                className="rounded-lg border border-white/10 bg-[#151515] p-3"
                key={workoutExercise.id}
              >
                <ExerciseRow
                  equipment={exercise?.equipment}
                  imageKey={exercise?.image_key}
                  name={exercise?.name ?? "Exercise"}
                  primaryMuscle={exercise?.primary_muscle}
                  progressText={`${completedSets}/${workoutExercise.target_sets} done`}
                />

                {sets.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                    {sets.map((set) => (
                      <div
                        className="grid grid-cols-4 gap-2 border-b border-white/10 px-3 py-2 text-sm text-zinc-300 last:border-b-0"
                        key={set.id}
                      >
                        <span>Set {set.set_number}</span>
                        <span>{set.weight_kg ?? "-"} kg</span>
                        <span>{set.reps ?? "-"} reps</span>
                        <span>RPE {set.rpe ?? "-"}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <SetInputRow
                  exerciseId={workoutExercise.exercise_id}
                  exerciseName={exercise?.name ?? "Exercise"}
                  nextSetNumber={nextSetNumber}
                  workoutId={workout.id}
                />
              </article>
            );
          })
        )}
      </section>

      <section
        className="mt-8 rounded-lg border border-white/10 bg-[#151515] p-4"
        id="add-exercises"
      >
        <h2 className="text-lg font-bold text-white">Add Exercises</h2>
        <form className="mt-4">
          <input
            className="min-h-12 w-full rounded-lg border border-white/10 bg-[#101010] px-4 text-base text-white outline-none focus:border-[#22c55e]"
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
        className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mx-auto flex min-h-14 max-w-sm items-center justify-center rounded-full bg-white text-sm font-black text-black shadow-2xl shadow-black"
        href="#add-exercises"
      >
        Add Exercises
      </a>
    </div>
  );
}
