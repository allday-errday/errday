import Link from "next/link";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { WorkoutTimer } from "@/components/gym/workout-timer";
import { requireUser } from "@/lib/auth";
import { formatDate, todayDateString } from "@/lib/dates";
import {
  getActiveWorkoutSession,
  getRecentWorkoutsWithSets,
  listWorkoutLogsForDay,
  listWorkoutTemplates,
} from "@/lib/db/gym";
import { safeRead } from "@/lib/db/safe-read";
import { gymPresets } from "@/lib/gym/presets";
import { startEmptyWorkout } from "./actions";
import { WorkoutLogForm } from "./workout-log-form";

export default async function GymPage() {
  const { supabase, user } = await requireUser();
  const today = todayDateString();
  const [activeSession, workouts, templates, workoutLogs] = await Promise.all([
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
    safeRead(listWorkoutTemplates(supabase, user.id), [], "workout templates"),
    safeRead(
      listWorkoutLogsForDay(supabase, user.id, today),
      [],
      "today workout logs",
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
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Errday Gym
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[var(--text)]">Workout</h1>
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

      <section className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold text-[var(--text)]">Weekly snapshot</h2>
          <Link className="text-sm font-bold text-[var(--accent)]" href="/gym/history">
            See more
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SnapshotMetric label="Workouts" value={`${weeklyWorkouts}`} />
          <SnapshotMetric label="Sets" value={`${weeklySets}`} />
          <SnapshotMetric
            label="Volume"
            value={`${Math.round(weeklyVolume).toLocaleString("de-CH")} kg`}
          />
        </div>
      </section>

      {activeSession ? (
        <section className="mb-6 rounded-2xl border border-[var(--accent)]/50 bg-[var(--accent-soft)] p-5 shadow-lg shadow-[var(--accent)]/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--accent)]">
                Active Workout
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                {activeWorkout?.name ?? "Workout"}
              </h2>
            </div>
            <WorkoutTimer startedAt={activeSession.started_at} />
          </div>
          <Link
            className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-bold text-black shadow-sm shadow-[var(--accent)]/20"
            href={`/gym/workout/${activeSession.workout_id}`}
          >
            Continue Workout
          </Link>
        </section>
      ) : (
        <form
          action={startEmptyWorkout}
          className="fixed inset-x-5 bottom-[calc(6.2rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-sm lg:static lg:mx-0 lg:mb-7 lg:mt-0 lg:max-w-xs"
        >
          <button
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-5 text-lg font-bold text-black shadow-xl shadow-[var(--accent)]/30"
            type="submit"
          >
            <span className="text-2xl">+</span>
            Start New Workout
          </button>
        </form>
      )}

      <section className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="mb-4 text-xl font-bold text-white">Log workout</h2>
        {templates.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">
            No workout templates found. Run migration 0004 in Supabase.
          </p>
        ) : (
          <WorkoutLogForm templates={templates} />
        )}
      </section>

      <section className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Today done</h2>
          <p className="text-sm font-bold text-[var(--accent)]">
            {workoutLogs.length} workouts
          </p>
        </div>
        {workoutLogs.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">
            No workouts logged today.
          </p>
        ) : (
          <div className="space-y-3">
            {workoutLogs.map((log) => (
              <article
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
                key={log.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{log.name}</h3>
                    <p className="mt-1 text-xs uppercase text-zinc-500">
                      {log.category} / {log.duration_minutes} min
                    </p>
                  </div>
                  <p className="font-bold text-[var(--accent)]">
                    {log.calories_burned} kcal
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text)]">Your program</h2>
          <Link
            className="text-sm font-bold text-[var(--accent)]"
            href="/gym/templates"
          >
            Templates
          </Link>
        </div>
        <div className="grid gap-3">
          {gymPresets.map((preset) => (
            <Link
              className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20 transition hover:border-[var(--accent)]/50 hover:shadow-md hover:shadow-[var(--accent)]/10"
              href={`/gym/workout/new?preset=${preset.slug}`}
              key={preset.slug}
            >
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--surface-2)] text-xl font-bold text-[var(--accent)]">
                {preset.key}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-bold text-white">
                  {preset.name}
                </h3>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {preset.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">
                  {preset.exerciseSlugs.length}
                </p>
                <p className="text-xs text-zinc-500">Exercises</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-7 grid grid-cols-2 gap-3">
        <QuickLink href="/gym/workout/new" title="Custom" value="Build" />
        <QuickLink href="/gym/exercises" title="Library" value="Browse" />
      </section>

      {templates.length > 0 ? (
        <section className="mb-7">
          <h2 className="mb-4 text-xl font-bold text-[var(--text)]">Saved</h2>
          <div className="space-y-3">
            {templates.map((template) => (
              <article
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20"
                key={template.id}
              >
                <h3 className="font-bold text-white">{template.name}</h3>
                {template.description ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {template.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Workouts</h2>
          <Link className="text-sm font-semibold text-[var(--accent)]" href="/gym/history">
            View all
          </Link>
        </div>
        {workouts.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">
            No workouts yet. Start one and your history will show here.
          </p>
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
      <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  value,
}: {
  href: string;
  title: string;
  value: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20 transition hover:border-[var(--accent)]/50 hover:shadow-md hover:shadow-[var(--accent)]/10"
      href={href}
    >
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </Link>
  );
}
