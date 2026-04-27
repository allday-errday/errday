import Link from "next/link";
import { ExerciseRow } from "@/components/gym/exercise-row";
import { WorkoutTimer } from "@/components/gym/workout-timer";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import {
  getActiveWorkoutSession,
  getRecentWorkoutsWithSets,
} from "@/lib/db/gym";
import { startEmptyWorkout } from "./actions";

const cards = [
  {
    href: "/gym/workout/new",
    title: "Start Empty Workout",
    description: "Build a session from scratch.",
  },
  {
    href: "/gym/exercises",
    title: "Exercise Library",
    description: "Browse base and custom movements.",
  },
  {
    href: "/gym/templates",
    title: "Templates",
    description: "Save repeatable training days.",
  },
  {
    href: "/gym/history",
    title: "Recent Workouts",
    description: "Review your completed sessions.",
  },
];

export default async function GymPage() {
  const { supabase, user } = await requireUser();
  const [activeSession, workouts] = await Promise.all([
    getActiveWorkoutSession(supabase, user.id),
    getRecentWorkoutsWithSets(supabase, user.id, 5),
  ]);
  const activeWorkout = workouts.find(
    (workout) => workout.id === activeSession?.workout_id,
  );

  return (
    <div>
      <PageHeader subtitle="Train hard. Track clean." title="Gym" />

      {activeSession ? (
        <section className="mb-5 rounded-lg border border-[#22c55e]/30 bg-[#101810] p-5 shadow-2xl shadow-[#22c55e]/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#22c55e]">
                Active Workout
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {activeWorkout?.name ?? "Workout"}
              </h2>
            </div>
            <WorkoutTimer startedAt={activeSession.started_at} />
          </div>
          <Link
            className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-white px-4 text-sm font-black text-black"
            href={`/gym/workout/${activeSession.workout_id}`}
          >
            Continue Workout
          </Link>
        </section>
      ) : (
        <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
          <h2 className="text-lg font-semibold text-white">Ready to train?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Start a quick empty workout or build one from the exercise library.
          </p>
          <form action={startEmptyWorkout} className="mt-4">
            <SubmitButton pendingLabel="Starting...">
              Start Empty Workout
            </SubmitButton>
          </form>
        </section>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            className="rounded-lg border border-white/10 bg-[#151515] p-4 shadow-lg shadow-black/20 transition hover:border-[#22c55e]/50"
            href={card.href}
            key={card.href}
          >
            <h2 className="text-base font-bold text-white">{card.title}</h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {card.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Workouts</h2>
          <Link className="text-sm font-semibold text-[#22c55e]" href="/gym/history">
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
