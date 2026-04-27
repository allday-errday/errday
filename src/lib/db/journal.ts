import type { SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntry, JournalEntryInsert } from "@/types/database";

export async function listJournalEntries(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(7)
    .returns<JournalEntry[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getJournalEntry(
  supabase: SupabaseClient,
  userId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<JournalEntry>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertJournalEntry(
  supabase: SupabaseClient,
  entry: JournalEntryInsert,
) {
  const { error } = await supabase
    .from("journal_entries")
    .upsert(entry, { onConflict: "user_id,date" });

  if (error) {
    throw error;
  }
}
