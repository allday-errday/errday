"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/toaster";
import { logSleepSession } from "./actions";

type Phase = "idle" | "winddown" | "sleeping";

type Persisted = {
  phase: Phase;
  winddownStart?: number;
  bedtime?: number;
};

type SleepSessionProps = {
  goalHours: number;
  suggestedBedtime: string | null;
};

const WINDDOWN_SECONDS = 15 * 60;
const STORAGE_KEY = "errday.sleepSession";

function hhmm(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function SleepSession({ goalHours, suggestedBedtime }: SleepSessionProps) {
  const router = useRouter();
  const [state, setState] = useState<Persisted>({ phase: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  // hydrate from localStorage once
  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(JSON.parse(raw) as Persisted);
        }
      } catch {
        // ignore
      }
      hydrated.current = true;
    }, 0);

    return () => window.clearTimeout(hydration);
  }, []);

  // persist on change (after hydration)
  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    try {
      if (state.phase === "idle") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // ignore
    }
  }, [state]);

  // ticking clock
  useEffect(() => {
    if (state.phase === "idle") {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.phase]);

  const goalMs = goalHours * 3600 * 1000;

  const startWinddown = useCallback(() => {
    setState({ phase: "winddown", winddownStart: Date.now() });
    setNow(Date.now());
  }, []);

  const startSleeping = useCallback((bedtime: number) => {
    setState({ phase: "sleeping", bedtime });
    setNow(Date.now());
  }, []);

  const cancel = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  const wakeUp = useCallback(async () => {
    if (!state.bedtime) {
      setState({ phase: "idle" });
      return;
    }
    const wake = Date.now();
    const hours = (wake - state.bedtime) / 3600000;
    setSaving(true);
    try {
      await logSleepSession(hours, hhmm(state.bedtime), hhmm(wake));
      setState({ phase: "idle" });
      toast(`Sleep tracked · ${(Math.round(hours * 10) / 10)}h`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [state.bedtime, router]);

  // auto-advance winddown -> sleeping at the end of the countdown
  useEffect(() => {
    if (state.phase !== "winddown" || !state.winddownStart) {
      return;
    }
    const bedtime = state.winddownStart + WINDDOWN_SECONDS * 1000;
    const timer = window.setTimeout(
      () => startSleeping(bedtime),
      Math.max(0, bedtime - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [state.phase, state.winddownStart, startSleeping]);

  // ---- IDLE ----
  if (state.phase === "idle") {
    return (
      <Shell
        icon="moon"
        title="Ready to wind down?"
        subtitle={
          suggestedBedtime
            ? `Suggested bedtime ${suggestedBedtime.slice(0, 5)} · ${goalHours}h goal`
            : `${goalHours}h sleep goal`
        }
      >
        <Ring progress={0} label="15:00" hint="wind-down" />
        <button
          className="mt-8 min-h-14 w-full max-w-xs rounded-full bg-[var(--accent)] text-base font-bold text-black transition hover:bg-[var(--accent-strong)]"
          onClick={startWinddown}
          type="button"
        >
          Start wind-down
        </button>
      </Shell>
    );
  }

  // ---- WINDDOWN ----
  if (state.phase === "winddown" && state.winddownStart) {
    const elapsed = (now - state.winddownStart) / 1000;
    const remaining = Math.max(0, WINDDOWN_SECONDS - elapsed);
    return (
      <Shell
        icon="moon"
        title="Winding down"
        subtitle="Dim the lights. Slow your breath. Put the phone down."
      >
        <Ring
          progress={elapsed / WINDDOWN_SECONDS}
          label={clock(remaining)}
          hint="until sleep"
        />
        <div className="mt-8 grid w-full max-w-xs gap-2">
          <button
            className="min-h-14 rounded-full bg-[var(--accent)] text-base font-bold text-black transition hover:bg-[var(--accent-strong)]"
            onClick={() => startSleeping(Date.now())}
            type="button"
          >
            I&apos;m asleep now
          </button>
          <button
            className="min-h-12 rounded-full text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
            onClick={cancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </Shell>
    );
  }

  // ---- SLEEPING ----
  if (state.phase === "sleeping" && state.bedtime) {
    const elapsedMs = now - state.bedtime;
    const progress = Math.min(1, elapsedMs / goalMs);
    const wakeTarget = state.bedtime + goalMs;
    const reached = elapsedMs >= goalMs;
    return (
      <Shell
        icon="zzz"
        title={reached ? "Goal reached" : "Sleeping"}
        subtitle={`Since ${hhmm(state.bedtime)} · target wake ${hhmm(wakeTarget)}`}
      >
        <Ring
          progress={progress}
          label={clock(elapsedMs / 1000)}
          hint={reached ? `${goalHours}h done` : `of ${goalHours}h`}
        />
        <button
          className="mt-8 min-h-14 w-full max-w-xs rounded-full bg-[var(--accent)] text-base font-bold text-black transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
          disabled={saving}
          onClick={wakeUp}
          type="button"
        >
          {saving ? "Saving..." : "I'm awake"}
        </button>
      </Shell>
    );
  }

  return null;
}

function Shell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: "moon" | "zzz";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border border-[var(--border)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon === "moon" ? (
          <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 14.5A7.5 7.5 0 0 1 9.5 3 8.5 8.5 0 1 0 21 14.5Z" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 8h6l-6 8h6" /><path d="M14 4h6l-6 6h6" />
          </svg>
        )}
      </span>
      <h2 className="mt-4 text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-400">{subtitle}</p>
      <div className="mt-8 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}

function Ring({
  progress,
  label,
  hint,
}: {
  progress: number;
  label: string;
  hint: string;
}) {
  const r = 86;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="relative grid size-52 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s linear" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-4xl font-bold tabular-nums text-white">{label}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
          {hint}
        </p>
      </div>
    </div>
  );
}
