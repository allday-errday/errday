import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProgram, listRoutines } from "@/lib/db/programs";
import { safeRead } from "@/lib/db/safe-read";
import { createRoutineAction, deleteRoutineAction } from "../actions";
import { ProgramPanels } from "./program-panels";

type ProgramPageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { programId } = await params;
  const { supabase, user } = await requireUser();
  const program = await getProgram(supabase, user.id, programId);

  if (!program) {
    notFound();
  }

  const routines = await safeRead(
    listRoutines(supabase, user.id, programId),
    [],
    "program routines",
  );
  const routineSummaries = routines.map((routine) => ({
    id: routine.id,
    name: routine.name,
    count: routine.workout_template_exercises[0]?.count ?? 0,
  }));

  return (
    <div>
      <nav className="mb-6 text-sm font-semibold text-zinc-400">
        <Link className="text-zinc-400 hover:text-white" href="/library">
          My Library
        </Link>
        <span className="px-2 text-zinc-600">/</span>
        <span className="text-white">{program.name}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-6 flex items-start gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--accent-soft)] text-2xl font-bold text-[var(--accent)]">
              {program.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="size-full object-cover" src={program.image_url} />
              ) : (
                program.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{program.name}</h1>
              {program.description ? (
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {program.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            {routines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-zinc-400">
                No routines yet. Create your first one below.
              </p>
            ) : (
              routines.map((routine) => {
                const count = routine.workout_template_exercises[0]?.count ?? 0;
                return (
                  <div
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 transition hover:border-[var(--accent)]/50"
                    key={routine.id}
                  >
                    <Link
                      className="flex min-w-0 flex-1 items-center gap-3"
                      href={`/library/${programId}/${routine.id}`}
                    >
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--surface-3)] text-sm font-bold text-[var(--accent)]">
                        {routine.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="size-full object-cover" src={routine.image_url} />
                        ) : (
                          routine.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{routine.name}</p>
                        <p className="text-xs text-zinc-400">{count} exercises</p>
                      </div>
                    </Link>
                    <form action={deleteRoutineAction}>
                      <input name="id" type="hidden" value={routine.id} />
                      <input name="program_id" type="hidden" value={programId} />
                      <button
                        aria-label={`Delete ${routine.name}`}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
                        type="submit"
                      >
                        <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4h6v3" />
                        </svg>
                      </button>
                    </form>
                  </div>
                );
              })
            )}
          </div>

          <form action={createRoutineAction} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input name="program_id" type="hidden" value={programId} />
            <input
              className="min-h-12 flex-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[var(--accent)]/70"
              name="name"
              placeholder="Routine name (e.g. legs)"
            />
            <button
              className="min-h-12 shrink-0 rounded-full bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-[var(--accent-strong)]"
              type="submit"
            >
              Create New Routine
            </button>
          </form>
        </section>

        <ProgramPanels routines={routineSummaries} />
      </div>
    </div>
  );
}
