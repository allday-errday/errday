import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "@/lib/db/profile";
import { safeRead } from "@/lib/db/safe-read";
import type { Profile } from "@/types/database";

export type MonthlyRecap = {
  daysWithFood: number;
  avgCalories: number | null;
  avgProteinG: number | null;
  avgSteps: number | null;
  avgActiveKcal: number | null;
  avgSleepHours: number | null;
  sleepNights: number;
  workoutCount: number;
  totalWorkoutMinutes: number;
  avgWaterMl: number | null;
  profile: Profile | null;
  rangeStart: string;
  rangeEnd: string;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getMonthlyRecap(
  supabase: SupabaseClient,
  userId: string,
): Promise<MonthlyRecap> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const startIso = start.toISOString();
  const startDate = isoDate(start);

  async function rows<T>(
    table: string,
    columns: string,
    sinceColumn: string,
    since: string,
  ): Promise<T[]> {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("user_id", userId)
      .gte(sinceColumn, since);

    if (error) throw error;
    return (data ?? []) as T[];
  }

  const [foodLogs, sleepLogs, healthMetrics, workoutLogs, waterLogs, profile] =
    await Promise.all([
      safeRead(
        rows<{ calories: number; protein_g: number; logged_at: string }>(
          "food_logs",
          "calories, protein_g, logged_at",
          "logged_at",
          startIso,
        ),
        [],
        "recap food",
      ),
      safeRead(
        rows<{ date: string; sleep_hours: number }>(
          "sleep_logs",
          "date, sleep_hours",
          "date",
          startDate,
        ),
        [],
        "recap sleep",
      ),
      safeRead(
        rows<{
          date: string;
          steps: number | null;
          active_energy_kcal: number | null;
        }>(
          "health_daily_metrics",
          "date, steps, active_energy_kcal",
          "date",
          startDate,
        ),
        [],
        "recap health",
      ),
      safeRead(
        rows<{ duration_minutes: number; logged_at: string }>(
          "workout_logs",
          "duration_minutes, logged_at",
          "logged_at",
          startIso,
        ),
        [],
        "recap workouts",
      ),
      safeRead(
        rows<{ amount_ml: number; logged_at: string }>(
          "water_logs",
          "amount_ml, logged_at",
          "logged_at",
          startIso,
        ),
        [],
        "recap water",
      ),
      safeRead(getProfile(supabase, userId), null, "recap profile"),
    ]);

  // Average per day that actually has entries — empty days don't drag
  // the averages to zero.
  const caloriesByDay = new Map<string, number>();
  const proteinByDay = new Map<string, number>();
  for (const log of foodLogs) {
    const day = log.logged_at.slice(0, 10);
    caloriesByDay.set(day, (caloriesByDay.get(day) ?? 0) + log.calories);
    proteinByDay.set(day, (proteinByDay.get(day) ?? 0) + Number(log.protein_g));
  }

  const waterByDay = new Map<string, number>();
  for (const log of waterLogs) {
    const day = log.logged_at.slice(0, 10);
    waterByDay.set(day, (waterByDay.get(day) ?? 0) + log.amount_ml);
  }

  const stepsValues = healthMetrics
    .map((metric) => metric.steps)
    .filter((value): value is number => value !== null);
  const activeKcalValues = healthMetrics
    .map((metric) =>
      metric.active_energy_kcal === null
        ? null
        : Number(metric.active_energy_kcal),
    )
    .filter((value): value is number => value !== null);
  const sleepValues = sleepLogs.map((log) => Number(log.sleep_hours));

  return {
    daysWithFood: caloriesByDay.size,
    avgCalories: average([...caloriesByDay.values()]),
    avgProteinG: average([...proteinByDay.values()]),
    avgSteps: average(stepsValues),
    avgActiveKcal: average(activeKcalValues),
    avgSleepHours: average(sleepValues),
    sleepNights: sleepValues.length,
    workoutCount: workoutLogs.length,
    totalWorkoutMinutes: workoutLogs.reduce(
      (sum, log) => sum + log.duration_minutes,
      0,
    ),
    avgWaterMl: average([...waterByDay.values()]),
    profile,
    rangeStart: startDate,
    rangeEnd: isoDate(end),
  };
}
