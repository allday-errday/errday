"use client";

import { LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  nativeScreenTime,
  supportsNativeScreenTime,
  type ScreenTimeStatus,
} from "@/lib/native/screen-time";

const limits = [30, 45, 60];

export function ScreenTimeCard() {
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const supported = supportsNativeScreenTime();

  useEffect(() => {
    if (!supported) return;

    nativeScreenTime
      .getStatus()
      .then((next) => {
        setStatus(next);
        if (next.limitMinutes) setMinutes(next.limitMinutes);
      })
      .catch(() => setMessage("Screen Time is not ready on this device."));
  }, [supported]);

  async function run(action: () => Promise<ScreenTimeStatus>) {
    setWorking(true);
    setMessage("");
    try {
      const next = await action();
      setStatus(next);
      if (next.limitMinutes) setMinutes(next.limitMinutes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update Screen Time.");
    } finally {
      setWorking(false);
    }
  }

  if (!supported) {
    return <p className="text-sm text-zinc-500">Available in the Errday iPhone app.</p>;
  }

  const selected = status?.selectionCount ?? 0;
  const connected = Boolean(status?.authorized);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <LockKeyhole className="size-5" />
        </span>
        <div>
          <p className="font-bold text-white">Daily app limits</p>
          <p className="mt-1 text-sm text-zinc-500">
            Choose apps once. Errday shields them when the daily limit ends.
          </p>
        </div>
      </div>

      {!connected ? (
        <button
          className="min-h-12 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] disabled:opacity-60"
          disabled={working}
          onClick={() => run(nativeScreenTime.requestAuthorization)}
          type="button"
        >
          Connect Screen Time
        </button>
      ) : (
        <>
          <button
            className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-5 text-sm font-extrabold text-white disabled:opacity-60"
            disabled={working}
            onClick={() => run(nativeScreenTime.presentAppPicker)}
            type="button"
          >
            {selected > 0 ? `Change ${selected} selections` : "Choose apps"}
          </button>

          <div className="flex gap-2">
            {limits.map((value) => (
              <button
                aria-pressed={minutes === value}
                className={`min-h-11 rounded-xl border px-4 text-sm font-extrabold ${
                  minutes === value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                    : "border-[var(--border)] text-zinc-500"
                }`}
                key={value}
                onClick={() => setMinutes(value)}
                type="button"
              >
                {value} min
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-12 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] disabled:opacity-60"
              disabled={working || selected === 0}
              onClick={() => run(() => nativeScreenTime.configureDailyLimit(minutes))}
              type="button"
            >
              Set daily limit
            </button>
            {status?.configured ? (
              <button
                className="min-h-12 rounded-xl border border-[var(--border)] px-5 text-sm font-bold text-zinc-400 disabled:opacity-60"
                disabled={working}
                onClick={() => run(nativeScreenTime.clearLimit)}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </>
      )}

      {status?.limitReached ? (
        <p className="text-sm font-bold text-[var(--accent-strong)]">
          Limit reached. The selected apps stay blocked until tomorrow.
        </p>
      ) : status?.configured ? (
        <p className="text-sm text-zinc-500">
          {status.limitMinutes} minutes set. No negotiation after the limit.
        </p>
      ) : null}
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}

      <div className="grid gap-2 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
        <Plan title="Free" detail="One daily focus limit" active />
        <Plan title="Plus" detail="More focus sets and weekly insights" />
      </div>
    </div>
  );
}

function Plan({ active = false, detail, title }: { active?: boolean; detail: string; title: string }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}>
      <div className="flex items-center gap-2">
        {title === "Plus" ? <Sparkles className="size-4 text-[var(--accent)]" /> : null}
        <p className="font-extrabold text-white">{title}</p>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}
