import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BodyWeightLogInsert,
  NutritionTarget,
  NutritionTargetInsert,
  Profile,
  ProfileInsert,
} from "@/types/database";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  profile: ProfileInsert,
) {
  const { error } = await supabase.from("profiles").upsert(profile);

  if (error) {
    throw error;
  }
}

export async function upsertBodyWeightLog(
  supabase: SupabaseClient,
  log: BodyWeightLogInsert,
) {
  const { error } = await supabase
    .from("body_weight_logs")
    .upsert(log, { onConflict: "user_id,date" });

  if (error) {
    throw error;
  }
}

export async function getNutritionTarget(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("nutrition_targets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<NutritionTarget>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertNutritionTarget(
  supabase: SupabaseClient,
  target: NutritionTargetInsert,
) {
  const { error } = await supabase
    .from("nutrition_targets")
    .upsert(target, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}
