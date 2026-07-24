import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateString, localDayRange, shiftDateString, todayDateString } from "@/lib/dates";
import type {
  DailyDaySetting,
  DailyDaySettingInsert,
  DailyProfile,
  DailyProfileInsert,
  DayType,
  WaterLog,
  WaterLogInsert,
} from "@/types/database";

export async function getDailyProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("daily_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<DailyProfile>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertDailyProfile(
  supabase: SupabaseClient,
  userId: string,
  input: Partial<Omit<DailyProfileInsert, "user_id">>,
) {
  const { error } = await supabase.from("daily_profiles").upsert(
    {
      user_id: userId,
      ...input,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

export async function getDaySetting(
  supabase: SupabaseClient,
  userId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("daily_day_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<DailyDaySetting>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertDaySetting(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  dayType: DayType,
) {
  const setting: DailyDaySettingInsert = {
    user_id: userId,
    date,
    day_type: dayType,
  };
  const { error } = await supabase
    .from("daily_day_settings")
    .upsert(setting, { onConflict: "user_id,date" });

  if (error) {
    throw error;
  }
}

export async function getTodayWaterLogs(
  supabase: SupabaseClient,
  userId: string,
  date = todayDateString(),
) {
  const range = localDayRange(date);
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", range.startIso)
    .lt("logged_at", range.endIso)
    .order("logged_at", { ascending: false })
    .returns<WaterLog[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createWaterLog(
  supabase: SupabaseClient,
  userId: string,
  amountMl: number,
) {
  const log: WaterLogInsert = {
    user_id: userId,
    amount_ml: amountMl,
  };
  const { error } = await supabase.from("water_logs").insert(log);

  if (error) {
    throw error;
  }
}

export async function getTodayWaterTotal(
  supabase: SupabaseClient,
  userId: string,
  date = todayDateString(),
) {
  const logs = await getTodayWaterLogs(supabase, userId, date);

  return logs.reduce((sum, log) => sum + log.amount_ml, 0);
}

export async function getDailyActivityStreak(
  supabase: SupabaseClient,
  userId: string,
  today = todayDateString(),
) {
  const start = localDayRange(shiftDateString(today, -90)).startIso;
  const [foodResult, waterResult] = await Promise.all([
    supabase
      .from("food_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", start),
    supabase
      .from("water_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", start),
  ]);

  if (foodResult.error) throw foodResult.error;
  if (waterResult.error) throw waterResult.error;

  const activeDates = new Set(
    [...(foodResult.data ?? []), ...(waterResult.data ?? [])].map((log) =>
      localDateString(new Date(log.logged_at)),
    ),
  );
  let streak = 0;
  let date = today;

  while (activeDates.has(date)) {
    streak += 1;
    date = shiftDateString(date, -1);
  }

  return streak;
}
