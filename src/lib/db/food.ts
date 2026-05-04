import type { SupabaseClient } from "@supabase/supabase-js";
import { localDayRange } from "@/lib/dates";
import type {
  FoodEntry,
  FoodEntryInsert,
  FoodItem,
  FoodLog,
  FoodLogInsert,
  FoodLogWithItem,
} from "@/types/database";

export type FoodTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function calculateFoodTotals(entries: FoodEntry[]): FoodTotals {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      proteinG: totals.proteinG + Number(entry.protein_g),
      carbsG: totals.carbsG + Number(entry.carbs_g),
      fatG: totals.fatG + Number(entry.fat_g),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function calculateFoodLogTotals(logs: FoodLog[]): FoodTotals {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + log.calories,
      proteinG: totals.proteinG + Number(log.protein_g),
      carbsG: totals.carbsG + Number(log.carbs_g),
      fatG: totals.fatG + Number(log.fat_g),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export async function listFoodItems(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("name", { ascending: true })
    .returns<FoodItem[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getFoodItem(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("id", id)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle<FoodItem>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listFoodLogsForDay(
  supabase: SupabaseClient,
  userId: string,
  date: string,
) {
  const range = localDayRange(date);
  const { data, error } = await supabase
    .from("food_logs")
    .select("*, food_items(*)")
    .eq("user_id", userId)
    .gte("logged_at", range.startIso)
    .lt("logged_at", range.endIso)
    .order("logged_at", { ascending: false })
    .returns<FoodLogWithItem[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createFoodLog(
  supabase: SupabaseClient,
  log: FoodLogInsert,
) {
  const { error } = await supabase.from("food_logs").insert(log);

  if (error) {
    throw error;
  }
}

export async function deleteFoodLog(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function listFoodEntries(
  supabase: SupabaseClient,
  userId: string,
  date?: string,
) {
  let query = supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query.returns<FoodEntry[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createFoodEntry(
  supabase: SupabaseClient,
  entry: FoodEntryInsert,
) {
  const { error } = await supabase.from("food_entries").insert(entry);

  if (error) {
    throw error;
  }
}

export async function deleteFoodEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("food_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
