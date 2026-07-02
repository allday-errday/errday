"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/components/toaster";
import { disableCalendarFeed, enableCalendarFeed } from "./actions";

type AppleCalendarCardProps = {
  feedPath: string | null;
  origin: string;
};

export function AppleCalendarCard({ feedPath, origin }: AppleCalendarCardProps) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const httpsUrl = feedPath ? `${origin}${feedPath}` : null;
  const webcalUrl = httpsUrl ? httpsUrl.replace(/^https?:\/\//, "webcal://") : null;

  function copy() {
    if (!webcalUrl) return;
    navigator.clipboard.writeText(webcalUrl).then(() => {
      setCopied(true);
      toast("✓ Feed link copied");
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!feedPath) {
    return (
      <div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Subscribe once on your iPhone and every Errday event — workouts,
          meals, reminders — shows up in the Apple Calendar app with native
          alerts.
        </p>
        <button
          className="mt-4 min-h-12 rounded-xl bg-white px-5 text-sm font-extrabold text-[#101116] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await enableCalendarFeed();
              toast("✓ Calendar feed enabled");
            })
          }
          type="button"
        >
          {isPending ? "Enabling…" : "Enable Apple Calendar feed"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Your private feed link. Anyone with this link can read your calendar,
        so keep it to yourself — you can rotate it anytime.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-black/20 p-2 pl-4">
        <code className="min-w-0 flex-1 truncate text-xs text-zinc-300">
          {webcalUrl}
        </code>
        <button
          aria-label="Copy feed link"
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-white"
          onClick={copy}
          type="button"
        >
          {copied ? <Check className="size-4 text-[var(--accent)]" /> : <Copy className="size-4" />}
        </button>
      </div>

      <ol className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">
        <li>
          <span className="font-semibold text-zinc-200">1.</span> Copy the link
          above.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">2.</span> On your
          iPhone: Settings → Apps → Calendar → Calendar Accounts → Add Account
          → Other → <span className="text-zinc-200">Add Subscribed Calendar</span>.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">3.</span> Paste the
          link and save. Events with a reminder ring natively on your phone.
        </li>
      </ol>
      <p className="mt-3 text-xs leading-5 text-zinc-600">
        Your iPhone must be able to reach this address — deploy Errday or use a
        tunnel if you run it only on localhost. Apple refreshes subscribed
        calendars periodically (usually within the hour).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm font-bold text-zinc-100 transition hover:bg-[var(--surface-3)] disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await enableCalendarFeed();
              toast("✓ New feed link generated");
            })
          }
          type="button"
        >
          <RefreshCw className="size-4" />
          Rotate link
        </button>
        <button
          className="min-h-11 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await disableCalendarFeed();
              toast("✓ Calendar feed disabled");
            })
          }
          type="button"
        >
          Disable feed
        </button>
      </div>
    </div>
  );
}
