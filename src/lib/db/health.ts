import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type HealthSyncToken = {
  user_id: string;
  token: string;
  created_at: string;
};

export type HealthDailyMetrics = {
  user_id: string;
  date: string;
  steps: number | null;
  active_energy_kcal: number | null;
  exercise_minutes: number | null;
  sleep_hours: number | null;
  updated_at: string;
};

export async function getHealthSyncToken(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("health_sync_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<HealthSyncToken>();

  if (error) {
    throw error;
  }

  return data;
}

export async function rotateHealthSyncToken(
  supabase: SupabaseClient,
  userId: string,
) {
  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase
    .from("health_sync_tokens")
    .upsert({ token, user_id: userId }, { onConflict: "user_id" });

  if (error) {
    throw error;
  }

  return token;
}

export async function deleteHealthSyncToken(
  supabase: SupabaseClient,
  userId: string,
) {
  const { error } = await supabase
    .from("health_sync_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getHealthMetricsForDay(
  supabase: SupabaseClient,
  userId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("health_daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<HealthDailyMetrics>();

  if (error) {
    throw error;
  }

  return data;
}
