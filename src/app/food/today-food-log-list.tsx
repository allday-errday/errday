"use client";

import { ChevronDown, Pencil, Trash2, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import type { FoodLogWithItem } from "@/types/database";
import { editFoodLog, removeFoodLog } from "./actions";

export function TodayFoodLogList({ logs }: { logs: FoodLogWithItem[] }) {
  const mealCount = logs.length;

  return (
    <details className="apple-group mb-6 group" open={mealCount > 0}>
      <summary className="apple-row flex cursor-pointer list-none items-center gap-3 px-4">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">Today&apos;s food</span>
          <span className="block text-sm text-zinc-500">
            {mealCount === 0
              ? "No meals logged"
              : `${mealCount} ${mealCount === 1 ? "meal" : "meals"} · ${Math.round(
                  logs.reduce((total, log) => total + log.calories, 0),
                )} kcal`}
          </span>
        </span>
        <ChevronDown className="size-5 text-zinc-500 transition group-open:rotate-180" />
      </summary>
      {mealCount === 0 ? (
        <div className="border-t border-[var(--border)] px-4 py-5">
          <p className="text-sm text-zinc-500">Your meals will appear here.</p>
        </div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {logs.map((log) => <FoodLogRow key={log.id} log={log} />)}
        </div>
      )}
    </details>
  );
}

function FoodLogRow({ log }: { log: FoodLogWithItem }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

  function finishSwipe() {
    const shouldReveal = dragOffset < -56;
    setRevealed(shouldReveal);
    setDragOffset(0);
    didSwipe.current = shouldReveal;
    pointerStart.current = null;
  }

  return (
    <article className="relative overflow-hidden border-b border-[var(--border)] last:border-b-0">
      <div className="absolute inset-y-0 right-0 w-20">
        <form action={removeFoodLog} className="h-full">
          <input name="id" type="hidden" value={log.id} />
          <button
            aria-label={`Delete ${foodName(log)}`}
            className="flex h-full w-full flex-col items-center justify-center gap-1 bg-red-600 px-3 text-xs font-semibold text-white"
            type="submit"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </button>
        </form>
      </div>
      <button
        aria-expanded={editing}
        className="apple-row relative z-10 flex w-full items-center gap-3 bg-[var(--surface)] px-4 text-left transition-transform duration-150"
        onClick={() => {
          if (didSwipe.current) {
            didSwipe.current = false;
            setRevealed(false);
            return;
          }
          setRevealed(false);
          setEditing((value) => !value);
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          setDragOffset(0);
        }}
        onPointerDown={(event) => {
          pointerStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const start = pointerStart.current;
          if (!start) return;
          const deltaX = event.clientX - start.x;
          const deltaY = event.clientY - start.y;
          if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
          if (deltaX < 0) setDragOffset(Math.max(-88, deltaX));
        }}
        onPointerUp={finishSwipe}
        style={{ transform: `translateX(${revealed ? -80 : dragOffset}px)` }}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-white">{foodName(log)}</span>
          <span className="block text-sm text-zinc-500">{formatLoggedTime(log.logged_at)}</span>
        </span>
        <span className="text-sm font-semibold text-white">{Math.round(log.calories)} kcal</span>
        {editing ? <X aria-hidden="true" className="size-4 text-zinc-500" /> : <Pencil aria-hidden="true" className="size-4 text-zinc-500" />}
      </button>
      {editing ? <FoodLogEditor log={log} onClose={() => setEditing(false)} /> : null}
    </article>
  );
}

function FoodLogEditor({ log, onClose }: { log: FoodLogWithItem; onClose: () => void }) {
  const [state, formAction] = useActionState(editFoodLog, initialActionState);

  return (
    <form action={formAction} className="grid gap-3 border-t border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
      <input name="id" type="hidden" value={log.id} />
      <p className="text-sm font-semibold text-white">{foodName(log)}</p>
      <label className="grid gap-1.5 text-sm font-medium text-zinc-300">
        Amount (g)
        <input
          className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-white outline-none focus:border-[var(--accent)]"
          defaultValue={Math.round(Number(log.servings) * 100)}
          min="1"
          name="grams"
          step="1"
          type="number"
        />
      </label>
      <p className="text-sm text-zinc-500">Calories and macros update automatically.</p>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-zinc-400" onClick={onClose} type="button">
          Cancel
        </button>
        <SubmitButton className="ml-auto" cooldownMs={0} pendingLabel="Saving...">Save changes</SubmitButton>
      </div>
    </form>
  );
}

function foodName(log: FoodLogWithItem) {
  return log.display_name ?? log.food_items?.name ?? "Meal";
}

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
});

function formatLoggedTime(value: string) {
  return timeFormatter.format(new Date(value));
}
