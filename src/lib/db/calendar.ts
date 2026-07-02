import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CalendarEvent,
  CalendarEventInsert,
  CalendarFeedToken,
} from "@/types/database";

export async function listCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  fromDate: string,
  toDate: string,
) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .returns<CalendarEvent[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function insertCalendarEvent(
  supabase: SupabaseClient,
  event: CalendarEventInsert,
) {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(event)
    .select("*")
    .single<CalendarEvent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCalendarEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  patch: Partial<Omit<CalendarEventInsert, "user_id" | "id">>,
) {
  const { error } = await supabase
    .from("calendar_events")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteCalendarEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
) {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getCalendarFeedToken(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("calendar_feed_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<CalendarFeedToken>();

  if (error) {
    throw error;
  }

  return data;
}

export async function rotateCalendarFeedToken(
  supabase: SupabaseClient,
  userId: string,
) {
  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase
    .from("calendar_feed_tokens")
    .upsert({ token, user_id: userId }, { onConflict: "user_id" });

  if (error) {
    throw error;
  }

  return token;
}

export async function deleteCalendarFeedToken(
  supabase: SupabaseClient,
  userId: string,
) {
  const { error } = await supabase
    .from("calendar_feed_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
