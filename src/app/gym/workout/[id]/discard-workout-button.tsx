"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "@/components/toaster";
import { discardWorkout } from "../../actions";

type DiscardWorkoutButtonProps = {
  sessionId: string;
  setCount: number;
  workoutId: string;
  workoutName: string;
};

export function DiscardWorkoutButton({
  sessionId,
  setCount,
  workoutId,
  workoutName,
}: DiscardWorkoutButtonProps) {
  const [open, setOpen] = useState(false);

  function keepWorkout() {
    setOpen(false);
    toast("Workout kept");
  }

  return (
    <>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 sm:w-auto"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Trash2 className="size-4" />
        Discard
      </button>

      {open ? (
        <div
          aria-labelledby="discard-workout-title"
          aria-modal="true"
          className="fixed inset-0 z-[9999] grid items-end sm:place-items-center sm:px-4 sm:py-6"
          role="dialog"
        >
          <button
            aria-label="Keep workout"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={keepWorkout}
            type="button"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.5rem] border border-red-500/25 bg-[var(--bg)] shadow-2xl shadow-black/60 sm:rounded-[1.5rem]">
            <div className="flex items-start gap-3 border-b border-white/10 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-300">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-red-300">Discard workout</p>
                <h2
                  className="mt-2 text-xl font-black leading-tight text-white"
                  id="discard-workout-title"
                >
                  Delete this session?
                </h2>
              </div>
              <button
                aria-label="Close discard confirmation"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                onClick={keepWorkout}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm leading-6 text-zinc-300">
                <span className="font-semibold text-white">{workoutName}</span>{" "}
                will be removed, including {setCount} logged set
                {setCount === 1 ? "" : "s"}. This cannot be undone.
              </p>
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-semibold leading-5 text-zinc-500">
                Choose Keep workout if you opened this by mistake. Choose
                Discard permanently to delete the active workout and return to
                Gym.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  className="min-h-12 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.07]"
                  onClick={keepWorkout}
                  type="button"
                >
                  Keep workout
                </button>
                <form action={discardWorkout}>
                  <input name="workout_id" type="hidden" value={workoutId} />
                  <input name="session_id" type="hidden" value={sessionId} />
                  <DiscardSubmitButton />
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DiscardSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-12 w-full rounded-xl bg-red-500 px-4 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Discarding..." : "Discard permanently"}
    </button>
  );
}
