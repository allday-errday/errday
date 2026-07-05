"use client";

import { useEffect, useState } from "react";
import {
  ensurePushSubscription,
  refreshExistingPushSubscription,
  removePushSubscription,
  sendTestPushNotification,
  supportsPushNotifications,
} from "@/lib/push/client";

type PushState = "blocked" | "disabled" | "enabled" | "loading" | "unsupported";

function permissionLabel() {
  if (typeof Notification === "undefined") {
    return "Not supported";
  }

  if (Notification.permission === "granted") {
    return "Allowed";
  }

  if (Notification.permission === "denied") {
    return "Blocked";
  }

  return "Not enabled";
}

export function PushNotificationControls() {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    async function load() {
      if (!supportsPushNotifications()) {
        setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }

      const subscription = await refreshExistingPushSubscription();
      setState(subscription ? "enabled" : "disabled");
    }

    load().catch(() => setState("disabled"));
  }, []);

  async function enable() {
    setMessage("");
    setState("loading");

    try {
      await ensurePushSubscription();
      setState("enabled");
      setMessage("Push is enabled on this device.");
    } catch (error) {
      setState(Notification.permission === "denied" ? "blocked" : "disabled");
      setMessage(error instanceof Error ? error.message : "Could not enable push.");
    }
  }

  async function disable() {
    setMessage("");
    setState("loading");

    try {
      await removePushSubscription();
      setState("disabled");
      setMessage("Push was disabled on this device.");
    } catch (error) {
      setState("enabled");
      setMessage(error instanceof Error ? error.message : "Could not disable push.");
    }
  }

  async function test() {
    setMessage("");

    try {
      const result = await sendTestPushNotification();
      setMessage(`Test sent to ${result.sent} device${result.sent === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send test push.");
    }
  }

  const isLoading = state === "loading";
  const canEnable = state === "disabled";
  const canDisable = state === "enabled";
  const canTest = state === "enabled";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">iPhone push</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            {permissionLabel()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEnable ? (
            <button
              className="min-h-10 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[var(--on-accent)]"
              onClick={enable}
              type="button"
            >
              Enable
            </button>
          ) : null}
          {canTest ? (
            <button
              className="min-h-10 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-white"
              onClick={test}
              type="button"
            >
              Test
            </button>
          ) : null}
          {canDisable ? (
            <button
              className="min-h-10 rounded-full border border-red-500/30 px-4 text-sm font-bold text-red-300"
              onClick={disable}
              type="button"
            >
              Disable
            </button>
          ) : null}
          {isLoading ? (
            <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] px-4 text-sm font-bold text-zinc-400">
              Checking
            </span>
          ) : null}
        </div>
      </div>
      {state === "unsupported" ? (
        <p className="mt-3 text-sm leading-6 text-amber-200">
          Install Errday from Safari to the Home Screen and set VAPID keys to enable push.
        </p>
      ) : null}
      {state === "blocked" ? (
        <p className="mt-3 text-sm leading-6 text-amber-200">
          Notifications are blocked in iOS settings for this app.
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p> : null}
    </div>
  );
}
