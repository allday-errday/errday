"use client";

import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/native/capacitor";
import { reminderCopy, type ReminderKey } from "@/lib/push/reminders";

const nativeReminderIds: Record<ReminderKey, number> = {
  meal_reminder_time: 101,
  supplement_reminder_time: 102,
  gym_reminder_time: 103,
  sleep_reminder_time: 104,
  journal_reminder_time: 105,
};

const reminderKeys = Object.keys(nativeReminderIds) as ReminderKey[];

export type NativeReminderSettings = {
  enabled: boolean;
  times: Partial<Record<ReminderKey, string | null>>;
};

export function supportsNativeLocalReminders() {
  return isNativeApp();
}

export function nativeReminderSettingsFromForm(formData: FormData): NativeReminderSettings {
  return {
    enabled: formData.get("reminders_enabled") === "on",
    times: {
      gym_reminder_time: formValue(formData, "gym_reminder_time"),
      journal_reminder_time: formValue(formData, "journal_reminder_time"),
      meal_reminder_time: formValue(formData, "meal_reminder_time"),
      sleep_reminder_time: formValue(formData, "sleep_reminder_time"),
      supplement_reminder_time: formValue(formData, "supplement_reminder_time"),
    },
  };
}

export async function scheduleNativeLocalReminders(settings: NativeReminderSettings) {
  if (!supportsNativeLocalReminders()) {
    return { scheduled: 0, supported: false };
  }

  await cancelNativeLocalReminders();

  if (!settings.enabled) {
    return { scheduled: 0, supported: true };
  }

  const permission = await ensurePermission();
  if (permission !== "granted") {
    throw new Error("iOS notification permission was not granted.");
  }

  const notifications = reminderKeys.flatMap((key) => {
    const time = parseTime(settings.times[key]);
    if (!time) {
      return [];
    }

    const copy = reminderCopy[key];
    return [
      {
        body: copy.body,
        extra: {
          source: "errday-native-reminder",
          url: copy.url,
        },
        id: nativeReminderIds[key],
        interruptionLevel: "active" as const,
        schedule: {
          on: {
            hour: time.hour,
            minute: time.minute,
          },
          repeats: true,
        },
        title: copy.title,
      },
    ];
  });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  return { scheduled: notifications.length, supported: true };
}

export async function cancelNativeLocalReminders() {
  if (!supportsNativeLocalReminders()) {
    return;
  }

  await LocalNotifications.cancel({
    notifications: reminderKeys.map((key) => ({ id: nativeReminderIds[key] })),
  });
}

export async function installNativeReminderClickHandler() {
  if (!supportsNativeLocalReminders()) {
    return;
  }

  await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const url = event.notification.extra?.url;

    if (typeof url === "string" && url.startsWith("/")) {
      window.location.assign(url);
    }
  });
}

async function ensurePermission() {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") {
    return "granted";
  }

  const requested = await LocalNotifications.requestPermissions();
  return requested.display;
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

function parseTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}
