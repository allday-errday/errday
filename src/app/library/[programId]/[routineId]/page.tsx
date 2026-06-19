import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseThumbnail } from "@/components/gym/exercise-thumbnail";
import { MuscleFilterChips } from "@/components/gym/muscle-filter-chips";
import { requireUser } from "@/lib/auth";
import { searchExercises } from "@/lib/db/exercises";
import { getProgram, getRoutineWithExercises } from "@/lib/db/programs";
import {
  addExerciseAction,
  removeRoutineExerciseAction,
  updateRoutineAction,
} from "../../actions";

type RoutineEditorPageProps = {
  params: Promise<{ programId: string; routineId: string }>;
  searchParams: Promise<{ q?: string; muscle?: string }>;
};

export default async function RoutineEditorPage({
  params,
  searchParams,
}: RoutineEditorPageProps) {
  const { programId, routineId } = await params;
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const muscle = sp.muscle ?? "All";
  const { supabase, user } = await requireUser();

  const [program, routine] = await Promise.all([
    getProgram(supabase, user.id, programId),
    getRoutineWithExercises(supabase, user.id, routineId),
  ]);

  if (!program || !routine) {
    notFound();
  }

  const exercises = await searchExercises(supabase, user.id, query, { muscle });
  const basePath = `/library/${programId}/${routineId}`;
  const searchString = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(muscle && muscle !== "All" ? { muscle } : {}),
  }).toString();

  return (
    <div>
      <nav className="mb-6 text-sm font-semibold text-zinc-400">
        <Link className="hover:text-white" href="/library">
          Library
        </Link>
        <span className="px-2 text-zinc-600">/</span>
        <Link className="hover:text-white" href={`/library/${programId}`}>
          {program.name}
        </Link>
        <span className="px-2 text-zinc-600">/</span>
        <span className="text-white">{routine.name}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: routine content */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <form action={updateRoutineAction} className="mb-5">
            <input name="id" type="hidden" value={routine.id} />
            <input name="program_id" type="hidden" value={programId} />
            <input
              className="w-full rounded-lg bg-transparent text-2xl font-bold text-white outline-none focus:bg-[var(--surface-2)] focus:px-2"
              defaultValue={routine.name}
              name="name"
            />
            <textarea
              className="mt-3 min-h-16 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-500 focus:border-[var(--accent)]/70"
              defaultValue={routine.description ?? ""}
              name="description"
              placeholder="Describe your routine..."
            />
            <button
              className="mt-2 rounded-lg bg-[var(--surface-2)] px-4 py-2 text-xs font-bold text-zinc-200 transition hover:bg-[var(--surface-3)]"
              type="submit"
            >
              Save details
            </button>
          </form>

          <div className="space-y-3">
            {routine.workout_template_exercises.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-zinc-400">
                No exercises yet. Add some from the picker on the right.
              </p>
            ) : (
              routine.workout_template_exercises.map((item) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  key={item.id}
                >
                  <ExerciseThumbnail
                    imageKey={item.exercises?.image_key}
                    name={item.exercises?.name ?? "Exercise"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">
                      {item.exercises?.name ?? "Exercise"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {item.target_sets} sets
                      {item.target_reps ? ` x ${item.target_reps} reps` : ""}
                    </p>
                  </div>
                  <form action={removeRoutineExerciseAction}>
                    <input name="id" type="hidden" value={item.id} />
                    <input name="template_id" type="hidden" value={routine.id} />
                    <input name="program_id" type="hidden" value={programId} />
                    <button
                      aria-label="Remove exercise"
                      className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
                      type="submit"
                    >
                      <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: exercise picker */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <form>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4">
              <svg aria-hidden="true" className="size-5 text-zinc-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="min-h-12 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-500"
                defaultValue={query}
                name="q"
                placeholder="Search for exercises"
                type="search"
              />
              {muscle !== "All" ? (
                <input name="muscle" type="hidden" value={muscle} />
              ) : null}
            </div>
          </form>

          <div className="mt-4">
            <MuscleFilterChips basePath={basePath} current={muscle} query={query} />
          </div>

          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {exercises.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                No exercises match your search.
              </p>
            ) : (
              exercises.map((exercise) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  key={exercise.id}
                >
                  <ExerciseThumbnail imageKey={exercise.image_key} name={exercise.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{exercise.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {exercise.primary_muscle}
                    </p>
                  </div>
                  <form action={addExerciseAction}>
                    <input name="template_id" type="hidden" value={routine.id} />
                    <input name="exercise_id" type="hidden" value={exercise.id} />
                    <input name="program_id" type="hidden" value={programId} />
                    <input name="search" type="hidden" value={searchString} />
                    <button
                      aria-label={`Add ${exercise.name}`}
                      className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-xl font-bold text-black transition hover:bg-[var(--accent-strong)]"
                      type="submit"
                    >
                      +
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
