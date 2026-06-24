"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
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

  return (
    <form action={formAction} className="grid gap-4" id="reminders">
      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3 py-3 text-sm font-medium text-zinc-200">
        <input
          defaultChecked={Boolean(profile?.reminders_enabled)}
          name="reminders_enabled"
          type="checkbox"
        />
        Enable daily reminders
      </label>
      <p className="text-sm text-zinc-500">
        Browser reminders will appear when this app is open and notifications are allowed.
      </p>

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
