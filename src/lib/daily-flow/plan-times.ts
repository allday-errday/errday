import type { DailyPlanSlot } from "./types";

export const PLAN_TIMES_COOKIE = "errday-plan-times";

export const defaultPlanTimes: Record<DailyPlanSlot, string> = {
  breakfast: "10:00",
  lunch: "13:00",
  pre_workout: "14:30",
  workout: "16:00",
  post_workout: "17:30",
  dinner: "19:30",
  snack: "21:00",
  sleep: "22:30",
};

export const planTimeFields: { label: string; slot: DailyPlanSlot }[] = [
  { label: "Breakfast", slot: "breakfast" },
  { label: "Lunch", slot: "lunch" },
  { label: "Pre-workout meal", slot: "pre_workout" },
  { label: "Workout", slot: "workout" },
  { label: "Post-workout meal", slot: "post_workout" },
  { label: "Dinner", slot: "dinner" },
  { label: "Snack", slot: "snack" },
  { label: "Sleep", slot: "sleep" },
];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parsePlanTimes(raw: string | undefined | null) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<Record<DailyPlanSlot, string>> = {};

    for (const { slot } of planTimeFields) {
      const value = parsed[slot];
      if (typeof value === "string" && timePattern.test(value)) {
        result[slot] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function isValidPlanTime(value: string) {
  return timePattern.test(value);
}
