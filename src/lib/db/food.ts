import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodEntry, FoodEntryInsert } from "@/types/database";

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
