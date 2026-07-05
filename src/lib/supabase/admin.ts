import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createAdminClient() {
  const { serviceRoleKey, url } = getSupabaseEnv();

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
