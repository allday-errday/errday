"use client";

import { useEffect } from "react";
import type { Profile } from "@/types/database";

type ReminderProfile = Pick<
  Profile,
  | "reminders_enabled"
  | "meal_reminder_time"
  | "supplement_reminder_time"
  | "gym_reminder_time"
  | "sleep_reminder_time"
  | "journal_reminder_time"
  | "gym_rest_end_reminder_enabled"
>;

const reminderItems: Array<{
  key: keyof Omit<ReminderProfile, "reminders_enabled" | "gym_rest_end_reminder_enabled">;
  title: string;
  body: string;
}> = [
  {
    key: "meal_reminder_time",
    title: "Food reminder",
    body: "Time to log your meal or supplement intake.",
  },
  {
    key: "supplement_reminder_time",
    title: "Supplement reminder",
    body: "Time to take your supplements.",
  },
  {
    key: "gym_reminder_time",
    title: "Gym reminder",
    body: "Time to head to the gym.",
  },
  {
    key: "sleep_reminder_time",
    title: "Sleep reminder",
    body: "Time to get ready for bed.",
  },
  {
    key: "journal_reminder_time",
    title: "Journal reminder",
    body: "Take a moment to journal your day.",
  },
];

function getNextOccurrence(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function scheduleNotification(title: string, body: string, delay: number) {
  if (delay < 0 || delay > 24 * 60 * 60 * 1000) {
    return;
  }

  window.setTimeout(() => {
    new Notification(title, { body, badge: "/manifest.webmanifest" });
  }, delay);
}

export function NotificationManager() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("Notification" in window)) {
      return;
    }

    let active = true;

    const loadProfile = async () => {
      const response = await fetch("/api/reminder-profile");
      if (!active || !response.ok) {
        return;
      }

      const data = (await response.json()) as {
        profile: ReminderProfile | null;
      };

      const profile = data.profile;
      if (!profile) {
        return;
      }

      const shouldRequestPermission =
        profile.reminders_enabled || profile.gym_rest_end_reminder_enabled;

      if (Notification.permission === "default" && shouldRequestPermission) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }
      }

      if (Notification.permission !== "granted") {
        return;
      }

      if (profile.reminders_enabled) {
        reminderItems.forEach((item) => {
          const time = profile[item.key];
          if (!time) {
            return;
          }

          const next = getNextOccurrence(time);
          scheduleNotification(item.title, item.body, next.getTime() - Date.now());
        });
      }

      if (
        profile.gym_rest_end_reminder_enabled &&
        window.location.pathname.startsWith("/gym/workout")
      ) {
        const restTimerDelay = 2 * 60 * 1000;
        scheduleNotification(
          "Rest timer finished",
          "Your gym rest timer is over. Ready for the next set?",
          restTimerDelay,
        );
      }
    };

    loadProfile().catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  return null;
}
