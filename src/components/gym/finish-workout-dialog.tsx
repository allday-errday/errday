"use client";

import { useState } from "react";
import { Field, inputClassName } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { finishWorkout } from "@/app/gym/actions";

type FinishWorkoutDialogProps = {
  sessionId: string;
  workoutId: string;
  workoutName: string;
};

export function FinishWorkoutDialog({
  sessionId,
  workoutId,
  workoutName,
}: FinishWorkoutDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="min-h-12 rounded-xl bg-white px-5 text-sm font-extrabold text-[var(--on-accent,#101116)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        Finish
      </button>

      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
          role="dialog"
        >
          <form
            action={finishWorkout}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-soft,#191b22)] p-5 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-white">
                Finish workout
              </h2>
              <button
                aria-label="Close"
                className="grid size-9 place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Give it a name and note how it went — it lands in your history.
            </p>

            <input name="session_id" type="hidden" value={sessionId} />
            <input name="workout_id" type="hidden" value={workoutId} />

            <div className="mt-4 grid gap-4">
              <Field label="Title">
                <input
                  className={inputClassName()}
                  defaultValue={workoutName}
                  maxLength={120}
                  name="title"
                  placeholder="Push day, heavy legs, …"
                  type="text"
                />
              </Field>
              <Field label="How was it? (optional)">
                <textarea
                  className={inputClassName("min-h-24 py-3")}
                  maxLength={600}
                  name="note"
                  placeholder="Strong session, new PR on bench …"
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-2">
              <SubmitButton pendingLabel="Finishing…">
                Save &amp; finish
              </SubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
