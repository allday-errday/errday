import Link from "next/link";
import { History, Plus } from "lucide-react";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
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
      <PageHeader
        title="Gym"
        trailing={
          <Link
            aria-label="Workout history"
            className="grid size-10 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--accent)] transition hover:bg-[var(--surface-3)]"
            href="/gym/history"
          >
            <History className="size-5" />
          </Link>
        }
      />

      {activeSession ? (
        <section className="apple-group mb-7 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="text-sm font-bold text-zinc-400">Workout in progress</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-4xl">
                {activeWorkout?.name ?? "Your workout"}
              </h2>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <WorkoutTimer startedAt={activeSession.started_at} />
              <Link
                className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-[var(--on-accent)] sm:flex-none"
                href={`/gym/workout/${activeSession.workout_id}`}
              >
                Continue
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="apple-group mb-7 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">Workout</h2>
            </div>
            <form action={startEmptyWorkout}>
              <SubmitButton
                className="flex w-full items-center justify-center gap-3 px-6 sm:w-auto"
                pendingLabel="Starting…"
              >
                <Plus className="size-5" />
                Start workout
              </SubmitButton>
            </form>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--border)] pt-1">
            <SnapshotMetric label="Workouts" value={`${weeklyWorkouts}`} />
            <SnapshotMetric label="Sets" value={`${weeklySets}`} />
            <SnapshotMetric label="Volume" value={`${Math.round(weeklyVolume).toLocaleString("de-CH")} kg`} />
          </div>
        </section>
      )}

      <section>
        <p className="apple-section-title">Activity</p>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent workouts</h2>
          <Link className="text-sm font-semibold text-[var(--accent)]" href="/gym/history">View all</Link>
        </div>
        {workouts.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">No workouts yet.</p>
        ) : (
          <div className="apple-group">
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
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="truncate text-xl font-bold text-[var(--text)] sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{label}</p>
    </div>
  );
}
