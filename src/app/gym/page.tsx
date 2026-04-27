import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listWorkouts } from "@/lib/db/gym";
import { removeWorkout } from "./actions";
import { WorkoutForm, WorkoutSetForm } from "./gym-forms";

export default async function GymPage() {
  const { supabase, user } = await requireUser();
  const workouts = await listWorkouts(supabase, user.id);

  return (
    <div>
      <PageHeader
        subtitle="Track workouts, exercises, sets and progress."
        title="Gym"
      />

      <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Start Workout</h2>
        <WorkoutForm />
      </section>

      <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Add Set</h2>
        {workouts.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">
            Create a workout first, then add exercise sets to it.
          </p>
        ) : (
          <WorkoutSetForm workouts={workouts} />
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="text-lg font-semibold text-white">Recent Workouts</h2>
        {workouts.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No workouts yet. Create your first manual workout above.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {workouts.map((workout) => (
              <article className="rounded-lg bg-black/20 p-4" key={workout.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{workout.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatDate(workout.date)}
                    </p>
                  </div>
                  <form action={removeWorkout}>
                    <input name="id" type="hidden" value={workout.id} />
                    <SubmitButton pendingLabel="Deleting..." variant="danger">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
                {workout.note ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {workout.note}
                  </p>
                ) : null}
                {workout.workout_sets.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {workout.workout_sets.map((set) => (
                      <div
                        className="rounded-lg border border-white/10 p-3 text-sm text-zinc-300"
                        key={set.id}
                      >
                        <p className="font-medium text-white">
                          {set.set_number}. {set.exercise_name}
                        </p>
                        <p className="mt-1 text-zinc-500">
                          {set.reps ?? "-"} reps · {set.weight_kg ?? "-"} kg ·
                          RPE {set.rpe ?? "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">
                    No sets added yet.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
