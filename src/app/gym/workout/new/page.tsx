import Link from "next/link";
import { ExerciseThumbnail } from "@/components/gym/exercise-thumbnail";
import { MuscleFilterChips } from "@/components/gym/muscle-filter-chips";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { searchExercises } from "@/lib/db/exercises";
import { startWorkoutFromSelection } from "../../actions";

type NewWorkoutPageProps = {
  searchParams: Promise<{
    error?: string;
    muscle?: string;
    q?: string;
  }>;
};

export default async function NewWorkoutPage({
  searchParams,
}: NewWorkoutPageProps) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const muscle = params.muscle ?? "All";
  const query = params.q ?? "";
  const exercises = await searchExercises(supabase, user.id, query, {
    muscle,
  });

  return (
    <div>
      <PageHeader
        subtitle="Pick movements, then start tracking sets."
        title="New Workout"
      />

      <form className="mb-4">
        <input
          className="min-h-12 w-full rounded-lg border border-white/10 bg-[#101010] px-4 text-base text-white outline-none focus:border-[#22c55e]"
          defaultValue={query}
          name="q"
          placeholder="Search exercises"
        />
        {muscle !== "All" ? <input name="muscle" type="hidden" value={muscle} /> : null}
      </form>

      <div className="mb-5">
        <MuscleFilterChips basePath="/gym/workout/new" current={muscle} query={query} />
      </div>

      {params.error === "select-exercise" ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          Select at least one exercise to start.
        </p>
      ) : null}

      <form action={startWorkoutFromSelection} className="space-y-5">
        <section className="rounded-lg border border-white/10 bg-[#151515] p-4">
          <label className="grid gap-2 text-sm font-medium text-zinc-300">
            Workout name
            <input
              className="min-h-12 rounded-lg border border-white/10 bg-[#0d0d0d] px-3 text-base text-white outline-none focus:border-[#22c55e]"
              defaultValue="Workout"
              name="name"
            />
          </label>
        </section>

        <section className="space-y-3">
          {exercises.map((exercise) => (
            <label
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#121212] p-3"
              key={exercise.id}
            >
              <input
                className="size-5 accent-[#22c55e]"
                name="exercise_id"
                type="checkbox"
                value={exercise.id}
              />
              <ExerciseThumbnail
                imageKey={exercise.image_key}
                name={exercise.name}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">
                  {exercise.name}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {exercise.primary_muscle} · {exercise.equipment}
                </span>
              </span>
            </label>
          ))}
        </section>

        <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 grid gap-2 rounded-full bg-black/70 p-2 backdrop-blur-xl">
          <SubmitButton pendingLabel="Starting...">Start Workout</SubmitButton>
          <Link
            className="text-center text-sm font-semibold text-zinc-500"
            href="/gym"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
