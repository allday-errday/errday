import Link from "next/link";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { WorkoutTimer } from "@/components/gym/workout-timer";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import {
  getActiveWorkoutSession,
  getRecentWorkoutsWithSets,
  listWorkoutTemplates,
} from "@/lib/db/gym";
import { gymPresets } from "@/lib/gym/presets";
import { startEmptyWorkout } from "./actions";

export default async function GymPage() {
  const { supabase, user } = await requireUser();
  const [activeSession, workouts, templates] = await Promise.all([
    getActiveWorkoutSession(supabase, user.id),
    getRecentWorkoutsWithSets(supabase, user.id, 5),
    listWorkoutTemplates(supabase, user.id),
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
    <div className="gym-screen -mx-4 -mt-[calc(1.25rem+env(safe-area-inset-top))] min-h-dvh bg-[#050505] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d946ef]">
            Errday Gym
          </p>
          <h1 className="mt-2 text-4xl font-black text-[#0b0b10]">Workout</h1>
        </div>
        <Link
          className="grid size-11 place-items-center rounded-full border border-white/10 bg-[#111111] text-xl font-black text-white"
          href="/gym/history"
          aria-label="Workout history"
        >
          ...
        </Link>
      </header>

      <section className="mb-7">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-black text-[#0b0b10]">Weekly snapshot</h2>
          <Link className="text-sm font-bold text-[#d946ef]" href="/gym/history">
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
        <section className="mb-6 rounded-3xl border border-[#d946ef]/30 bg-[#101810] p-5 shadow-2xl shadow-[#d946ef]/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#d946ef]">
                Active Workout
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {activeWorkout?.name ?? "Workout"}
              </h2>
            </div>
            <WorkoutTimer startedAt={activeSession.started_at} />
          </div>
          <Link
            className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-[#d946ef] px-4 text-sm font-black text-black"
            href={`/gym/workout/${activeSession.workout_id}`}
          >
            Continue Workout
          </Link>
        </section>
      ) : (
        <form
          action={startEmptyWorkout}
          className="fixed inset-x-5 bottom-[calc(6.2rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-sm"
        >
          <button
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-full bg-[#0b0b10] px-5 text-lg font-black text-white shadow-2xl shadow-black/30"
            type="submit"
          >
            <span className="text-2xl">+</span>
            Start New Workout
          </button>
        </form>
      )}

      <section className="mb-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#0b0b10]">Your program</h2>
          <Link
            className="text-sm font-bold text-[#d946ef]"
            href="/gym/templates"
          >
            Templates
          </Link>
        </div>
        <div className="grid gap-3">
          {gymPresets.map((preset) => (
            <Link
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-[#111111] p-4 shadow-lg shadow-black/20 transition hover:border-[#d946ef]/50"
              href={`/gym/workout/new?preset=${preset.slug}`}
              key={preset.slug}
            >
              <div className="grid size-14 place-items-center rounded-2xl bg-white text-xl font-black text-black">
                {preset.key}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-black text-white">
                  {preset.name}
                </h3>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {preset.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">
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
          <h2 className="mb-4 text-xl font-black text-[#0b0b10]">Saved</h2>
          <div className="space-y-3">
            {templates.map((template) => (
              <article
                className="rounded-3xl border border-white/10 bg-[#111111] p-4"
                key={template.id}
              >
                <h3 className="font-black text-white">{template.name}</h3>
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

      <section className="rounded-3xl border border-white/10 bg-[#111111] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Recent Workouts</h2>
          <Link className="text-sm font-semibold text-[#d946ef]" href="/gym/history">
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
    <div>
      <p className="text-2xl font-black text-[#0b0b10]">{value}</p>
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
      className="rounded-3xl border border-white/10 bg-[#111111] p-4 shadow-lg shadow-black/20"
      href={href}
    >
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </Link>
  );
}
