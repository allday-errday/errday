"use client";

import { useEffect, useRef, useState } from "react";

export const SET_LOGGED_EVENT = "errday:set-logged";

const restSeconds = 120;

function format(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function RestTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    function start() {
      endsAtRef.current = Date.now() + restSeconds * 1_000;
      notifiedRef.current = false;
      setRemaining(restSeconds);
    }

    window.addEventListener(SET_LOGGED_EVENT, start);
    return () => window.removeEventListener(SET_LOGGED_EVENT, start);
  }, []);

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
      endsAtRef.current = Date.now() + restSeconds * 1_000;
      notifiedRef.current = false;
      setRemaining(restSeconds);
    } else {
      endsAtRef.current = null;
      setRemaining(null);
    }
  }

  if (remaining !== null && remaining <= 0) {
    return (
      <button
        className="mb-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--signal)]/15 px-4 text-base font-extrabold text-[var(--signal)]"
        onClick={toggle}
        type="button"
      >
        Rest done — go!
      </button>
    );
  }

  if (remaining !== null) {
    const progress = remaining / restSeconds;
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
        <span className="relative text-lg font-extrabold tabular-nums">
          {format(remaining)}
        </span>
      </button>
    );
  }

  return (
    <button
      className="mb-5 flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
      onClick={toggle}
      type="button"
    >
      <span className="text-sm font-bold">Rest timer</span>
      <span className="text-sm font-extrabold tabular-nums">2:00</span>
    </button>
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
