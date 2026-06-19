import { ExerciseRow } from "@/components/gym/exercise-row";
import { MuscleFilterChips } from "@/components/gym/muscle-filter-chips";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { searchExercises } from "@/lib/db/exercises";
import { CustomExerciseForm } from "./custom-exercise-form";

type ExerciseLibraryPageProps = {
  searchParams: Promise<{
    muscle?: string;
    q?: string;
  }>;
};

export default async function ExerciseLibraryPage({
  searchParams,
}: ExerciseLibraryPageProps) {
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
        subtitle="Search movements and build your private library."
        title="Exercise Library"
      />

      <form className="mb-4">
        <input
          className="min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 text-base text-white outline-none focus:border-[var(--accent)]"
          defaultValue={query}
          name="q"
          placeholder="Search exercises"
        />
        {muscle !== "All" ? <input name="muscle" type="hidden" value={muscle} /> : null}
      </form>

      <div className="mb-5">
        <MuscleFilterChips basePath="/gym/exercises" current={muscle} query={query} />
      </div>

      <section className="mb-6 space-y-3">
        {exercises.map((exercise) => (
          <ExerciseRow
            equipment={exercise.equipment}
            imageKey={exercise.image_key}
            key={exercise.id}
            name={exercise.name}
            primaryMuscle={exercise.primary_muscle}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Add Custom Exercise
        </h2>
        <CustomExerciseForm />
      </section>
    </div>
  );
}
