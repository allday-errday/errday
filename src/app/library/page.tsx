import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPrograms } from "@/lib/db/programs";
import { safeRead } from "@/lib/db/safe-read";
import { createProgramAction } from "./actions";

export default async function LibraryPage() {
  const { supabase, user } = await requireUser();
  const programs = await safeRead(
    listPrograms(supabase, user.id),
    [],
    "workout programs",
  );

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
          My Library
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Programs
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Build programs, fill them with routines, and tap a routine to edit its
          exercises.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <form action={createProgramAction} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-12 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[var(--accent)]/70"
            name="name"
            placeholder="New program name (e.g. The Great Lock In of 2026)"
            required
          />
          <button
            className="min-h-12 shrink-0 rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-[var(--accent-strong)]"
            type="submit"
          >
            Create program
          </button>
        </form>
      </section>

      {programs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-10 text-center">
          <p className="font-bold text-white">No programs yet</p>
          <p className="mt-2 text-sm text-zinc-400">
            Create your first program above to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Link
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)]"
              href={`/library/${program.id}`}
              key={program.id}
            >
              <div className="grid aspect-[16/9] place-items-center bg-[var(--accent-soft)] text-3xl font-bold text-[var(--accent)]">
                {program.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={program.image_url}
                  />
                ) : (
                  program.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="p-4">
                <h2 className="truncate font-bold text-white">{program.name}</h2>
                {program.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                    {program.description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
