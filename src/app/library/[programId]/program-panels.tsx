"use client";

import { useState } from "react";

type RoutineSummary = {
  id: string;
  name: string;
  count: number;
};

type ProgramPanelsProps = {
  routines: RoutineSummary[];
};

export function ProgramPanels({ routines }: ProgramPanelsProps) {
  const [tab, setTab] = useState<"library" | "breakdown">("library");
  const totalExercises = routines.reduce((sum, r) => sum + r.count, 0);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-5 flex gap-6 border-b border-[var(--border)]">
        <TabButton
          active={tab === "library"}
          label="Workout Library"
          onClick={() => setTab("library")}
        />
        <TabButton
          active={tab === "breakdown"}
          label="Program Breakdown"
          onClick={() => setTab("breakdown")}
        />
      </div>

      {tab === "library" ? (
        <div className="grid place-items-center py-16 text-center">
          <p className="font-bold text-white">No workouts found</p>
          <p className="mt-1 text-sm text-zinc-400">
            There are no logged workouts in this program yet.
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-3">
            <Stat label="Routines" value={routines.length} />
            <Stat label="Exercises" value={totalExercises} />
          </div>
          {routines.length === 0 ? (
            <p className="text-sm text-zinc-400">Add routines to see a breakdown.</p>
          ) : (
            <ul className="space-y-2">
              {routines.map((routine) => (
                <li
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
                  key={routine.id}
                >
                  <span className="font-semibold text-white">{routine.name}</span>
                  <span className="text-sm text-zinc-400">
                    {routine.count} exercises
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`-mb-px border-b-2 pb-3 text-sm font-bold transition ${
        active
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-transparent text-zinc-400 hover:text-zinc-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}
