"use client";

import { useEffect, useRef, useState } from "react";

export const SET_LOGGED_EVENT = "errday:set-logged";

const defaultRestSeconds = 120;
const minSeconds = 15;
const maxSeconds = 600;

function storageKeyFor(exercise: string) {
  return `errday-rest-${exercise.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function format(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

type RestTimerProps = {
  exerciseName?: string;
};

export function RestTimer({ exerciseName = "default" }: RestTimerProps) {
  const [duration, setDuration] = useState(defaultRestSeconds);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const notifiedRef = useRef(false);

  // Load the saved per-exercise duration on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKeyFor(exerciseName));
      const parsed = saved ? Number(saved) : NaN;
      if (Number.isFinite(parsed) && parsed >= minSeconds && parsed <= maxSeconds) {
        // Syncing from localStorage after mount avoids a hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDuration(parsed);
      }
    } catch {}
  }, [exerciseName]);

  function persistDuration(next: number) {
    setDuration(next);
    try {
      window.localStorage.setItem(storageKeyFor(exerciseName), String(next));
    } catch {}
  }

  function adjust(delta: number) {
    const next = Math.min(maxSeconds, Math.max(minSeconds, duration + delta));
    persistDuration(next);
  }

  useEffect(() => {
    function start() {
      endsAtRef.current = Date.now() + duration * 1_000;
      notifiedRef.current = false;
      setRemaining(duration);
    }

    window.addEventListener(SET_LOGGED_EVENT, start);
    return () => window.removeEventListener(SET_LOGGED_EVENT, start);
  }, [duration]);

  useEffect(() => {
    if (remaining === null) return;

    if (remaining <= 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notifyRestDone().catch(console.error);
      }
      const timeout = window.setTimeout(() => setRemaining(null), 4_000);
      return () => window.clearTimeout(timeout);
    }

    const interval = window.setInterval(() => {
      const endsAt = endsAtRef.current;
      if (!endsAt) return;
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1_000)));
    }, 250);

    return () => window.clearInterval(interval);
  }, [remaining]);

  function toggle() {
    if (remaining === null) {
      endsAtRef.current = Date.now() + duration * 1_000;
      notifiedRef.current = false;
      setRemaining(duration);
    } else {
      endsAtRef.current = null;
      setRemaining(null);
    }
  }

  if (remaining !== null && remaining <= 0) {
    return (
      <button
        className="mb-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--signal)]/15 px-4 text-base font-bold text-[var(--signal)]"
        onClick={toggle}
        type="button"
      >
        Rest done — go!
      </button>
    );
  }

  if (remaining !== null) {
    const progress = remaining / duration;
    return (
      <button
        className="relative mb-5 flex min-h-11 w-full items-center justify-between overflow-hidden rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 text-[var(--accent-strong)]"
        onClick={toggle}
        type="button"
      >
        <span
          className="absolute inset-y-0 left-0 bg-[var(--accent)]/15 transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative text-sm font-bold">Resting — tap to skip</span>
        <span className="relative text-lg font-bold tabular-nums">
          {format(remaining)}
        </span>
      </button>
    );
  }

  return (
    <div className="mb-5 flex min-h-11 w-full items-stretch gap-1.5">
      <button
        className="flex flex-1 items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        onClick={toggle}
        type="button"
      >
        <span className="text-sm font-bold">Rest timer</span>
        <span className="text-sm font-bold tabular-nums">{format(duration)}</span>
      </button>
      <button
        aria-label="Shorter rest"
        className="grid w-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-lg font-bold text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        onClick={() => adjust(-15)}
        type="button"
      >
        −
      </button>
      <button
        aria-label="Longer rest"
        className="grid w-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-lg font-bold text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        onClick={() => adjust(15)}
        type="button"
      >
        +
      </button>
    </div>
  );
}

async function notifyRestDone() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const options = {
    body: "Your rest timer is over. Ready for the next set?",
    icon: "/icons/icon-192.png",
    tag: "errday-rest-timer",
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Rest timer finished", options);
    return;
  }

  new Notification("Rest timer finished", options);
}
