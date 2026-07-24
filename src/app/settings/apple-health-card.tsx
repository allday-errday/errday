"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "@/components/toaster";
import {
  supportsNativeHealthKit,
  syncNativeHealthKitMetrics,
} from "@/lib/native/health-kit";
import { disableHealthSync, enableHealthSync } from "./actions";

type AppleHealthCardProps = {
  origin: string;
  token: string | null;
};

export function AppleHealthCard({ origin, token }: AppleHealthCardProps) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<"url" | "token" | null>(null);
  const [nativeHealthSupported, setNativeHealthSupported] = useState(false);
  const [nativeMessage, setNativeMessage] = useState("");

  const ingestUrl = `${origin}/api/health/ingest`;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setNativeHealthSupported(supportsNativeHealthKit());
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function copy(value: string, which: "url" | "token") {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(which);
      toast("✓ Copied");
      window.setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!token) {
    return (
      <div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Send steps, active calories and sleep from your iPhone or Apple Watch
          to Errday once a day. The Xcode app can read Apple Health directly;
          Safari can use a free iOS Shortcut.
        </p>
        <button
          className="mt-4 min-h-12 rounded-xl bg-white px-5 text-sm font-bold text-[var(--bg)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await enableHealthSync();
              toast("✓ Apple Health sync enabled");
            })
          }
          type="button"
        >
          {isPending ? "Enabling…" : "Enable Apple Health sync"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Your private sync key. Anyone with this key can write health data to
        your account, so keep it to yourself — you can rotate it anytime.
      </p>

      {nativeHealthSupported ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Native Apple Health</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                iPhone app
              </p>
            </div>
            <button
              className="min-h-10 rounded-full bg-[var(--accent)] px-4 text-sm font-bold text-[var(--on-accent)]"
              onClick={async () => {
                setNativeMessage("Reading Apple Health...");
                try {
                  const result = await syncNativeHealthKitMetrics({
                    endpoint: ingestUrl,
                    token,
                  });

                  if (result.ok) {
                    setNativeMessage("Apple Health synced for today.");
                    toast("✓ Apple Health synced");
                  } else {
                    setNativeMessage("Apple Health is not available on this device.");
                  }
                } catch (error) {
                  setNativeMessage(
                    error instanceof Error ? error.message : "Apple Health sync failed.",
                  );
                }
              }}
              type="button"
            >
              Sync today
            </button>
          </div>
          {nativeMessage ? (
            <p className="mt-3 text-sm leading-6 text-zinc-400">{nativeMessage}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <Row
          copied={copied === "url"}
          label="Endpoint"
          onCopy={() => copy(ingestUrl, "url")}
          value={ingestUrl}
        />
        <Row
          copied={copied === "token"}
          label="Sync key"
          onCopy={() => copy(token, "token")}
          value={token}
        />
      </div>

      <ol className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">
        <li>
          <span className="font-semibold text-zinc-200">1.</span> On your
          iPhone, open <span className="text-zinc-200">Shortcuts</span> and
          create a new shortcut.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">2.</span> Add{" "}
          <span className="text-zinc-200">Find Health Samples</span> actions for
          Steps, Active Energy and Sleep (yesterday/today, grouped and summed).
        </li>
        <li>
          <span className="font-semibold text-zinc-200">3.</span> Add{" "}
          <span className="text-zinc-200">Get Contents of URL</span>: method
          POST, the endpoint above, header{" "}
          <code className="text-zinc-200">Authorization: Bearer &lt;sync key&gt;</code>,
          JSON body with{" "}
          <code className="text-zinc-200">steps</code>,{" "}
          <code className="text-zinc-200">active_energy_kcal</code> and{" "}
          <code className="text-zinc-200">sleep_hours</code>.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">4.</span> In{" "}
          <span className="text-zinc-200">Automation</span>, run it every
          morning (e.g. 09:00) — steps and burned calories then show up on
          Today automatically.
        </li>
      </ol>
      <p className="mt-3 text-xs leading-5 text-zinc-600">
        Synced sleep never overwrites a night you logged yourself. Missing
        fields keep their previous value.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm font-bold text-zinc-100 transition hover:bg-[var(--surface-3)] disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await enableHealthSync();
              toast("✓ New sync key generated");
            })
          }
          type="button"
        >
          <RefreshCw className="size-4" />
          Rotate key
        </button>
        <button
          className="min-h-11 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await disableHealthSync();
              toast("✓ Apple Health sync disabled");
            })
          }
          type="button"
        >
          Disable sync
        </button>
      </div>
    </div>
  );
}

function Row({
  copied,
  label,
  onCopy,
  value,
}: {
  copied: boolean;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-black/20 p-2 pl-4">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate text-xs text-zinc-300">{value}</code>
      <button
        aria-label={`Copy ${label}`}
        className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-white"
        onClick={onCopy}
        type="button"
      >
        {copied ? <Check className="size-4 text-[var(--accent)]" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
