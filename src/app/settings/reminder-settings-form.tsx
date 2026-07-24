"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { PushNotificationControls } from "@/components/push-notification-controls";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import {
  nativeReminderSettingsFromForm,
  scheduleNativeLocalReminders,
  supportsNativeLocalReminders,
} from "@/lib/native/local-reminders";
import type { Profile } from "@/types/database";
import { saveReminderSettings } from "./actions";

type ReminderSettingsFormProps = {
  profile: Profile | null;
};

function timeValue(value: string | null | undefined) {
  return value?.slice(0, 5) ?? "";
}

export function ReminderSettingsForm({ profile }: ReminderSettingsFormProps) {
  const [state, formAction] = useActionState(
    saveReminderSettings,
    initialActionState,
  );
  const latestFormData = useRef<FormData | null>(null);
  const [nativeMessage, setNativeMessage] = useState("");
  const [nativeSupported, setNativeSupported] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setNativeSupported(supportsNativeLocalReminders());
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const syncNativeReminders = useCallback(async (formData: FormData) => {
    if (!supportsNativeLocalReminders()) {
      return;
    }

    setNativeMessage("Syncing iPhone reminders...");

    try {
      const result = await scheduleNativeLocalReminders(
        nativeReminderSettingsFromForm(formData),
      );
      setNativeMessage(
        result.scheduled === 0
          ? "iPhone reminders are off."
          : `${result.scheduled} iPhone reminder${result.scheduled === 1 ? "" : "s"} scheduled.`,
      );
    } catch (error) {
      setNativeMessage(
        error instanceof Error ? error.message : "Could not schedule iPhone reminders.",
      );
    }
  }, []);

  useEffect(() => {
    if (state.status !== "success" || !latestFormData.current) {
      return;
    }

    syncNativeReminders(latestFormData.current);
  }, [state, syncNativeReminders]);

  function syncCurrentNativeReminders() {
    const form = document.getElementById("reminders");
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const formData = new FormData(form);
    latestFormData.current = formData;
    syncNativeReminders(formData);
  }

  return (
    <form
      action={formAction}
      className="grid gap-4"
      id="reminders"
      onSubmit={(event) => {
        latestFormData.current = new FormData(event.currentTarget);
      }}
    >
      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3 py-3 text-sm font-medium text-zinc-200">
        <input
          defaultChecked={Boolean(profile?.reminders_enabled)}
          name="reminders_enabled"
          type="checkbox"
        />
        Enable daily reminders
      </label>
      <p className="text-sm text-zinc-500">
        Safari Home Screen uses web push. The Xcode app uses native iPhone
        reminders.
      </p>
      <PushNotificationControls />
      {nativeSupported ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Native iPhone reminders</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Xcode app
              </p>
            </div>
            <button
              className="min-h-10 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-white"
              onClick={syncCurrentNativeReminders}
              type="button"
            >
              Sync
            </button>
          </div>
          {nativeMessage ? (
            <p className="mt-3 text-sm leading-6 text-zinc-400">{nativeMessage}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ReminderTimeField
          defaultValue={timeValue(profile?.meal_reminder_time)}
          label="Food reminder"
          name="meal_reminder_time"
        />
        <ReminderTimeField
          defaultValue={timeValue(profile?.supplement_reminder_time)}
          label="Supplements"
          name="supplement_reminder_time"
        />
        <ReminderTimeField
          defaultValue={timeValue(profile?.gym_reminder_time)}
          label="Go to gym"
          name="gym_reminder_time"
        />
        <ReminderTimeField
          defaultValue={timeValue(profile?.sleep_reminder_time)}
          label="Go to sleep"
          name="sleep_reminder_time"
        />
        <ReminderTimeField
          defaultValue={timeValue(profile?.journal_reminder_time)}
          label="Journal time"
          name="journal_reminder_time"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3 py-3 text-sm font-medium text-zinc-200">
        <input
          defaultChecked={Boolean(profile?.gym_rest_end_reminder_enabled)}
          name="gym_rest_end_reminder_enabled"
          type="checkbox"
        />
        Gym: notify when rest timer is over
      </label>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving reminders...">
        Save reminders
      </SubmitButton>
    </form>
  );
}

function ReminderTimeField({
  defaultValue,
  label,
  name,
}: {
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      <input
        className="min-h-12 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-white outline-none transition focus:border-[var(--accent)]/70"
        defaultValue={defaultValue}
        name={name}
        type="time"
      />
    </label>
  );
}
