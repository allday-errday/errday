import type { SupabaseClient } from "@supabase/supabase-js";
import type { SleepLog, SleepLogInsert } from "@/types/database";

export async function listSleepLogs(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(7)
    .returns<SleepLog[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getSleepLog(
  supabase: SupabaseClient,
  userId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<SleepLog>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertSleepLog(
  supabase: SupabaseClient,
  log: SleepLogInsert,
) {
  const { error } = await supabase
    .from("sleep_logs")
    .upsert(log, { onConflict: "user_id,date" });

  if (error) {
    throw error;
  }
}
