import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { anonKey, url } = getSupabaseEnv();

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createBrowserClient(url, anonKey);
}
