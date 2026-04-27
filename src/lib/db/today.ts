import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateFoodTotals, listFoodEntries } from "@/lib/db/food";
import { listJournalEntries } from "@/lib/db/journal";
import { getProfile } from "@/lib/db/profile";
import { listSleepLogs } from "@/lib/db/sleep";
import { todayDateString } from "@/lib/dates";
import type { BodyWeightLog, WorkoutWithSets } from "@/types/database";

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
  const [profile, foodEntries, sleepLogs, journalEntries, latestWeight, workouts] =
    await Promise.all([
      getProfile(supabase, userId),
      listFoodEntries(supabase, userId, today),
      listSleepLogs(supabase, userId),
      listJournalEntries(supabase, userId),
      getLatestBodyWeight(supabase, userId),
      getTodayWorkouts(supabase, userId, today),
    ]);

  const todaySleep = sleepLogs.find((log) => log.date === today) ?? sleepLogs[0];
  const todayJournal = journalEntries.find((entry) => entry.date === today);

  return {
    today,
    profile,
    foodEntries,
    foodTotals: calculateFoodTotals(foodEntries),
    latestWeight,
    todaySleep,
    todayJournal,
    workouts,
  };
}
