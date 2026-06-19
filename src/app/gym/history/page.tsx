import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getRecentWorkoutsWithSets } from "@/lib/db/gym";

export default async function GymHistoryPage() {
  const { supabase, user } = await requireUser();
  const workouts = await getRecentWorkoutsWithSets(supabase, user.id, 30);

  return (
    <div>
      <PageHeader
        subtitle="Review sets, exercises and training volume."
        title="Workout History"
      />

      {workouts.length === 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
          <p className="text-sm leading-6 text-zinc-400">
            No workouts yet. Start a workout and it will appear here.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {workouts.map((workout) => {
            const exerciseCount = new Set(
              workout.workout_exercises.map((exercise) => exercise.exercise_id),
            ).size;
            const totalSets = workout.workout_sets.length;
            const volume = workout.workout_sets.reduce((sum, set) => {
              const weight = Number(set.weight_kg ?? 0);
              const reps = Number(set.reps ?? 0);
              return sum + weight * reps;
            }, 0);

            return (
              <Link
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20 transition hover:border-[var(--accent)]/50 hover:shadow-md hover:shadow-[var(--accent)]/10"
                href={`/gym/workout/${workout.id}`}
                key={workout.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-white">{workout.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatDate(workout.date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[var(--accent)]">
                    {totalSets} sets
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Exercises" value={`${exerciseCount}`} />
                  <Metric label="Sets" value={`${totalSets}`} />
                  <Metric label="Volume" value={`${Math.round(volume)} kg`} />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
