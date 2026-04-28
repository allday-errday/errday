import Link from "next/link";
import { ExerciseThumbnail } from "@/components/gym/exercise-thumbnail";
import { MuscleFilterChips } from "@/components/gym/muscle-filter-chips";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { searchExercises } from "@/lib/db/exercises";
import { getGymPreset } from "@/lib/gym/presets";
import { startWorkoutFromSelection } from "../../actions";

type NewWorkoutPageProps = {
  searchParams: Promise<{
    error?: string;
    muscle?: string;
    preset?: string;
    q?: string;
  }>;
};

type ExerciseSearchResult = Awaited<ReturnType<typeof searchExercises>>;

export default async function NewWorkoutPage({
  searchParams,
}: NewWorkoutPageProps) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const muscle = params.muscle ?? "All";
  const query = params.q ?? "";
  const preset = getGymPreset(params.preset);
  const exercises = await searchExercises(supabase, user.id, query, {
    muscle,
  });
  const presetExercises = preset
    ? preset.exerciseSlugs
        .map((slug) => exercises.find((exercise) => exercise.slug === slug))
        .filter((exercise) => exercise !== undefined)
    : [];

  return (
    <div className="gym-screen -mx-4 -mt-[calc(1.25rem+env(safe-area-inset-top))] min-h-dvh bg-white px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      {preset ? (
        <PresetWorkoutStart
          error={params.error}
          exercises={presetExercises}
          preset={preset}
        />
      ) : (
        <CustomWorkoutBuilder
          error={params.error}
          exercises={exercises}
          muscle={muscle}
          query={query}
        />
      )}
    </div>
  );
}

function CustomWorkoutBuilder({
  error,
  exercises,
  muscle,
  query,
}: {
  error?: string;
  exercises: ExerciseSearchResult;
  muscle: string;
  query: string;
}) {
  return (
    <>
      <PageHeader
        subtitle="Pick movements, then start tracking sets."
        title="New Workout"
      />

      <form className="mb-4">
        <input
          className="min-h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-base text-zinc-900 outline-none focus:border-[#d946ef]"
          defaultValue={query}
          name="q"
          placeholder="Search exercises"
        />
        {muscle !== "All" ? <input name="muscle" type="hidden" value={muscle} /> : null}
      </form>

      <div className="mb-5">
        <MuscleFilterChips
          basePath="/gym/workout/new"
          current={muscle}
          query={query}
        />
      </div>

      {error === "select-exercise" ? (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Select at least one exercise to start.
        </p>
      ) : null}

      <form action={startWorkoutFromSelection} className="space-y-5">
        <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70">
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Workout name
            <input
              className="min-h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 outline-none focus:border-[#d946ef]"
              defaultValue="Workout"
              name="name"
            />
          </label>
        </section>

        <section className="space-y-3">
          {exercises.map((exercise) => (
            <label
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-200/70"
              key={exercise.id}
            >
              <input
                className="size-5 accent-[#d946ef]"
                name="exercise_id"
                type="checkbox"
                value={exercise.id}
              />
              <ExerciseThumbnail
                imageKey={exercise.image_key}
                name={exercise.name}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-zinc-900">
                  {exercise.name}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {exercise.primary_muscle} / {exercise.equipment}
                </span>
              </span>
            </label>
          ))}
        </section>

        <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 grid gap-2 rounded-full border border-zinc-200 bg-white/90 p-2 backdrop-blur-xl">
          <SubmitButton pendingLabel="Starting...">Start Workout</SubmitButton>
          <Link
            className="text-center text-sm font-semibold text-zinc-500"
            href="/gym"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

function PresetWorkoutStart({
  error,
  exercises,
  preset,
}: {
  error?: string;
  exercises: ExerciseSearchResult;
  preset: NonNullable<ReturnType<typeof getGymPreset>>;
}) {
  const totalSets = exercises.length * 4;

  return (
    <div>
      <header className="sticky top-0 z-20 -mx-4 mb-5 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="grid grid-cols-3 items-center">
          <Link
            aria-label="Back to gym"
            className="text-3xl leading-none text-[#d946ef]"
            href="/gym"
          >
            &lt;
          </Link>
          <p className="text-center text-lg font-black text-[#0b0b10]">Workout</p>
          <Link
            aria-label="Open exercise library"
            className="text-right text-2xl leading-none text-[#d946ef]"
            href="/gym/exercises"
          >
            ...
          </Link>
        </div>
      </header>

      <section className="mb-5">
        <h1 className="text-4xl font-black lowercase text-[#0b0b10]">
          {preset.name}
        </h1>
        <p className="mt-3 text-lg font-bold text-zinc-500">
          {preset.description}
        </p>
      </section>

      <section className="mb-7 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
        <div className="grid grid-cols-3 divide-x divide-zinc-200 text-center">
          <PresetMetric label="Total Sets" value={`${totalSets}`} />
          <PresetMetric label="Duration" value={`~${preset.durationMinutes} min`} />
          <PresetMetric label="Focus" value={preset.muscles[0] ?? "Gym"} />
        </div>
      </section>

      {error === "select-exercise" ? (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          This preset needs exercises from the library. Apply migration 0003 if
          this list is empty.
        </p>
      ) : null}

      <form action={startWorkoutFromSelection}>
        <input name="name" type="hidden" value={preset.name} />
        <section className="space-y-4">
          {exercises.map((exercise) => (
            <div className="flex items-center gap-4" key={exercise.id}>
              <input name="exercise_id" type="hidden" value={exercise.id} />
              <ExerciseThumbnail
                imageKey={exercise.image_key}
                name={exercise.name}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold text-[#0b0b10]">
                  {exercise.name}
                </h2>
                <p className="mt-1 text-base text-zinc-500">
                  4 Set / {exercise.primary_muscle}
                </p>
              </div>
            </div>
          ))}
        </section>

        <div className="fixed inset-x-5 bottom-[calc(6.2rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-sm">
          <button
            className="flex min-h-16 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-lg font-black text-white shadow-xl shadow-zinc-300/60"
            type="submit"
          >
            Start workout
          </button>
        </div>
      </form>
    </div>
  );
}

function PresetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-black text-zinc-900">{value}</p>
    </div>
  );
}
