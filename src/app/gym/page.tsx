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
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-7 sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Errday Gym
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--text)] sm:text-5xl">
            Train without friction.
          </h1>
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
        <section className="flow-hero mb-7 overflow-hidden rounded-[1.5rem] border border-[var(--accent)]/35 p-5 shadow-[0_30px_80px_-45px_var(--accent)] sm:rounded-[2rem] sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="eyebrow">Workout in progress</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">
                {activeWorkout?.name ?? "Your workout"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Pick up exactly where you stopped. Your sets and timer are waiting.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <WorkoutTimer startedAt={activeSession.started_at} />
              <Link
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-black text-[#0b0c10] shadow-lg shadow-[var(--accent)]/20 sm:flex-none"
                href={`/gym/workout/${activeSession.workout_id}`}
              >
                Continue
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="flow-hero mb-7 overflow-hidden rounded-[1.5rem] border border-[var(--border-strong)] p-5 shadow-[0_30px_80px_-45px_var(--accent)] sm:rounded-[2rem] sm:p-8">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <p className="eyebrow">Ready when you are</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">
                One tap. Then lift.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
                Start empty or choose a program below. No setup maze, no tiny dropdowns.
              </p>
            </div>
            <form action={startEmptyWorkout}>
              <button
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-7 text-base font-black text-[#0b0c10] shadow-xl shadow-[var(--accent)]/25 transition hover:-translate-y-0.5 sm:w-auto"
                type="submit"
              >
                <span className="text-xl">+</span>
                Start workout
              </button>
            </form>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 sm:mt-8 sm:gap-3">
            <SnapshotMetric label="Workouts" value={`${weeklyWorkouts}`} />
            <SnapshotMetric label="Sets" value={`${weeklySets}`} />
            <SnapshotMetric label="Volume" value={`${Math.round(weeklyVolume).toLocaleString("de-CH")} kg`} />
          </div>
        </section>
      )}

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="min-w-0 space-y-7">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Pick a route</p>
                <h2 className="mt-2 text-2xl font-black text-white">Your program</h2>
              </div>
              <Link className="text-sm font-bold text-[var(--accent)]" href="/gym/templates">Templates</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {gymPresets.map((preset) => (
                <Link
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-[var(--accent)]/45 hover:bg-[var(--surface-2)] sm:rounded-3xl sm:p-5"
                  href={`/gym/workout/new?preset=${preset.slug}`}
                  key={preset.slug}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-lg font-black text-[var(--accent)]">{preset.key}</div>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-bold text-zinc-500">{preset.exerciseSlugs.length} exercises</span>
                  </div>
                  <h3 className="mt-6 text-xl font-black text-white">{preset.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">{preset.description}</p>
                  <p className="mt-5 text-sm font-bold text-[var(--accent)]">Start plan →</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <QuickLink href="/gym/workout/new" title="Build your own" value="Custom workout" />
            <QuickLink href="/gym/exercises" title="Find movements" value="Exercise library" />
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Recent workouts</h2>
              <Link className="text-sm font-semibold text-[var(--accent)]" href="/gym/history">View all</Link>
            </div>
            {workouts.length === 0 ? (
              <p className="text-sm leading-6 text-zinc-400">No workouts yet. Start one and your history will show here.</p>
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

        <aside className="space-y-5 lg:sticky lg:top-28">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
            <div className="mb-4">
              <p className="eyebrow">Quick log</p>
              <h2 className="mt-2 text-xl font-black text-white">Already trained?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Choose the session. Details stay optional.</p>
            </div>
            {templates.length === 0 ? (
              <p className="text-sm leading-6 text-zinc-400">No workout templates found yet.</p>
            ) : (
              <WorkoutLogForm templates={templates} />
            )}
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Today</h2>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--signal)]">{workoutLogs.length} done</p>
            </div>
            {workoutLogs.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-zinc-500">Your completed sessions land here.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {workoutLogs.map((log) => (
                  <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/65 p-3.5" key={log.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">{log.name}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{log.duration_minutes} min · {log.category}</p>
                      </div>
                      <p className="text-xs font-bold text-[var(--accent)]">{log.calories_burned} kcal</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
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
      className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20 transition hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] sm:p-5"
      href={href}
    >
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-1 text-base font-black text-white sm:text-lg">{value}</p>
    </Link>
  );
}
