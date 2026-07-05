import type { Profile, PushSubscriptionRecord } from "@/types/database";

export type ReminderKey =
  | "meal_reminder_time"
  | "supplement_reminder_time"
  | "gym_reminder_time"
  | "sleep_reminder_time"
  | "journal_reminder_time";

export const reminderCopy: Record<
  ReminderKey,
  { body: string; title: string; url: string }
> = {
  meal_reminder_time: {
    body: "Log your meal so today's macros stay honest.",
    title: "Food reminder",
    url: "/food",
  },
  supplement_reminder_time: {
    body: "Quick check-in: supplements time.",
    title: "Supplement reminder",
    url: "/today",
  },
  gym_reminder_time: {
    body: "Your training slot is coming up.",
    title: "Gym reminder",
    url: "/gym",
  },
  sleep_reminder_time: {
    body: "Start winding down and protect tomorrow's energy.",
    title: "Sleep reminder",
    url: "/sleep",
  },
  journal_reminder_time: {
    body: "Take a minute to clear the day.",
    title: "Journal reminder",
    url: "/journal",
  },
};

export const reminderKeys = Object.keys(reminderCopy) as ReminderKey[];

type ReminderProfile = Pick<
  Profile,
  "id" | "reminders_enabled" | ReminderKey
>;

function parseMinutes(time: string | null) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function dueRemindersForSubscription({
  now = new Date(),
  profile,
  subscription,
  windowMinutes = 15,
}: {
  now?: Date;
  profile: ReminderProfile;
  subscription: Pick<PushSubscriptionRecord, "timezone">;
  windowMinutes?: number;
}) {
  if (!profile.reminders_enabled) {
    return [];
  }

  const timeZone = subscription.timezone || "Europe/Zurich";
  const zoned = getZonedParts(now, timeZone);

  return reminderKeys
    .map((key) => {
      const targetMinutes = parseMinutes(profile[key]);
      if (targetMinutes === null) {
        return null;
      }

      const delta = (zoned.minutes - targetMinutes + 24 * 60) % (24 * 60);
      if (delta >= windowMinutes) {
        return null;
      }

      return {
        key,
        sentForDate: zoned.date,
        ...reminderCopy[key],
      };
    })
    .filter((reminder) => reminder !== null);
}
