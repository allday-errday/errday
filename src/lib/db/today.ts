import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateFoodLogTotals, listFoodLogsForDay } from "@/lib/db/food";
import { listJournalEntries } from "@/lib/db/journal";
import { getNutritionTarget, getProfile } from "@/lib/db/profile";
import { listSleepLogs } from "@/lib/db/sleep";
import { todayDateString } from "@/lib/dates";
import type { BodyWeightLog, WorkoutWithSets } from "@/types/database";
import { listWorkoutLogsForDay } from "./gym";
import {
  calculateNetCalories,
  calculateOnTrackStatus,
  calculateRemainingCalories,
} from "@/lib/nutrition/calculations";

async function safeDashboardRead<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
) {
  try {
    return await promise;
  } catch (error) {
    console.error(`[Today] ${label} failed`, error);
    return fallback;
  }
}

export async function getLatestBodyWeight(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("body_weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle<BodyWeightLog>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTodayWorkouts(
  supabase: SupabaseClient,
  userId: string,
  date = todayDateString(),
) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_sets(*)")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .returns<WorkoutWithSets[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTodayDashboard(
  supabase: SupabaseClient,
  userId: string,
) {
  const today = todayDateString();
  const [
    profile,
    nutritionTarget,
    foodLogs,
    sleepLogs,
    journalEntries,
    latestWeight,
    workouts,
    workoutLogs,
  ] = await Promise.all([
    safeDashboardRead(getProfile(supabase, userId), null, "profile"),
    safeDashboardRead(
      getNutritionTarget(supabase, userId),
      null,
      "nutrition target",
    ),
    safeDashboardRead(
      listFoodLogsForDay(supabase, userId, today),
      [],
      "food logs",
    ),
    safeDashboardRead(listSleepLogs(supabase, userId), [], "sleep logs"),
    safeDashboardRead(
      listJournalEntries(supabase, userId),
      [],
      "journal entries",
    ),
    safeDashboardRead(
      getLatestBodyWeight(supabase, userId),
      null,
      "latest body weight",
    ),
    safeDashboardRead(
      getTodayWorkouts(supabase, userId, today),
      [],
      "legacy workouts",
    ),
    safeDashboardRead(
      listWorkoutLogsForDay(supabase, userId, today),
      [],
      "workout logs",
    ),
  ]);

  const todaySleep = sleepLogs.find((log) => log.date === today) ?? sleepLogs[0];
  const todayJournal = journalEntries.find((entry) => entry.date === today);
  const foodTotals = calculateFoodLogTotals(foodLogs);
  const workoutCalories = workoutLogs.reduce(
    (sum, log) => sum + log.calories_burned,
    0,
  );
  const targetCalories =
    nutritionTarget?.daily_calorie_target ?? profile?.calorie_target ?? null;
  const targetProtein =
    nutritionTarget?.daily_protein_target_g ?? profile?.protein_target_g ?? null;
  const netCalories = calculateNetCalories({
    consumed: foodTotals.calories,
    burned: workoutCalories,
  });

  return {
    today,
    profile,
    nutritionTarget,
    foodEntries: foodLogs,
    foodLogs,
    foodTotals,
    latestWeight,
    todaySleep,
    todayJournal,
    workouts,
    workoutLogs,
    workoutCalories,
    netCalories,
    remainingCalories: calculateRemainingCalories({
      target: targetCalories,
      netCalories,
    }),
    targetCalories,
    targetProtein,
    onTrackStatus: calculateOnTrackStatus({
      netCalories,
      proteinG: foodTotals.proteinG,
      targetCalories,
      targetProteinG: targetProtein,
    }),
  };
}
