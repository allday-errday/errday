import Link from "next/link";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { WorkoutTimer } from "@/components/gym/workout-timer";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import {
  getActiveWorkoutSession,
  getRecentWorkoutsWithSets,
} from "@/lib/db/gym";
import { safeRead } from "@/lib/db/safe-read";
import { startEmptyWorkout } from "./actions";

export default async function GymPage() {
  const { supabase, user } = await requireUser();
  const [activeSession, workouts] = await Promise.all([
    safeRead(
      getActiveWorkoutSession(supabase, user.id),
      null,
      "active workout session",
    ),
    safeRead(
      getRecentWorkoutsWithSets(supabase, user.id, 5),
      [],
      "recent workouts",
    ),
  ]);
  const activeWorkout = workouts.find(
    (workout) => workout.id === activeSession?.workout_id,
  );
  const weeklyWorkouts = workouts.length;
  const weeklySets = workouts.reduce(
    (sum, workout) => sum + workout.workout_sets.length,
    0,
  );
  const weeklyVolume = workouts.reduce((sum, workout) => {
    return sum + workout.workout_sets.reduce((setSum, set) => {
      return setSum + Number(set.weight_kg ?? 0) * Number(set.reps ?? 0);
    }, 0);
  }, 0);

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-7 sm:items-center">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-[var(--text)] sm:text-5xl">Gym</h1>
        </div>
        <Link
          className="grid size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-zinc-300 shadow-sm shadow-black/20 transition hover:bg-[var(--surface-2)]"
          href="/gym/history"
          aria-label="Workout history"
        >
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" />
          </svg>
        </Link>
      </header>

      {activeSession ? (
        <section className="flow-hero mb-7 overflow-hidden rounded-xl border border-[var(--accent)]/35 p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="text-sm font-bold text-zinc-400">Workout in progress</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">
                {activeWorkout?.name ?? "Your workout"}
              </h2>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <WorkoutTimer startedAt={activeSession.started_at} />
              <Link
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[#0b0c10] shadow-lg shadow-black/20 sm:flex-none"
                href={`/gym/workout/${activeSession.workout_id}`}
              >
                Continue
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="flow-hero mb-7 overflow-hidden rounded-xl border border-[var(--border-strong)] p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">Ready to train?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">Start a workout and add exercises as you go.</p>
            </div>
            <form action={startEmptyWorkout}>
              <button
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-7 text-base font-black text-[var(--on-accent)] transition hover:-translate-y-0.5 sm:w-auto"
                type="submit"
              >
                <span className="text-xl">+</span>
                Start workout
              </button>
            </form>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 sm:gap-3">
            <SnapshotMetric label="Workouts" value={`${weeklyWorkouts}`} />
            <SnapshotMetric label="Sets" value={`${weeklySets}`} />
            <SnapshotMetric label="Volume" value={`${Math.round(weeklyVolume).toLocaleString("de-CH")} kg`} />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Recent workouts</h2>
          <Link className="text-sm font-semibold text-[var(--accent)]" href="/gym/history">View all</Link>
        </div>
        {workouts.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">No workouts yet.</p>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <ExerciseRow
                href={`/gym/workout/${workout.id}`}
                imageKey="workout"
                key={workout.id}
                name={workout.name}
                primaryMuscle={formatDate(workout.date)}
                progressText={`${workout.workout_sets.length} sets logged`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-3 sm:p-4">
      <p className="truncate text-xl font-black text-[var(--text)] sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{label}</p>
    </div>
  );
}
