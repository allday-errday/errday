import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { buildCalendarIcs } from "@/lib/ics";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { CalendarEvent } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 32) {
    return new Response("Not found", { status: 404 });
  }

  const { anonKey, url } = getSupabaseEnv();
  if (!url || !anonKey) {
    return new Response("Feed is not configured", { status: 503 });
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("calendar_feed_events", {
    feed_token: token,
  });

  if (error) {
    return new Response("Feed unavailable", { status: 503 });
  }

  // An unknown token and an empty calendar look identical on purpose,
  // so tokens cannot be probed.
  const events = (data ?? []) as CalendarEvent[];
  return new Response(buildCalendarIcs(events), { headers: icsHeaders() });
}

function icsHeaders() {
  return {
    "Cache-Control": "private, max-age=300",
    "Content-Disposition": 'attachment; filename="errday.ics"',
    "Content-Type": "text/calendar; charset=utf-8",
  };
}
