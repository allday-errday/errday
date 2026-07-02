import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type IngestBody = {
  date?: unknown;
  steps?: unknown;
  active_energy_kcal?: unknown;
  exercise_minutes?: unknown;
  sleep_hours?: unknown;
};

function numberOrNull(value: unknown, max: number) {
  if (typeof value === "string" && value.trim()) {
    value = Number(value);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), max);
}

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const rateLimit = checkRateLimit(`health-ingest:${ip}`, 60, 10 * 60);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests." },
      { headers: rateLimitHeaders(rateLimit), status: 429 },
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length < 32) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { anonKey, url } = getSupabaseEnv();
  if (!url || !anonKey) {
    return Response.json({ error: "Sync is not configured." }, { status: 503 });
  }

  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const date =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

  const steps = numberOrNull(body.steps, 200_000);
  const activeKcal = numberOrNull(body.active_energy_kcal, 20_000);
  const exerciseMinutes = numberOrNull(body.exercise_minutes, 1_440);
  const sleepHours = numberOrNull(body.sleep_hours, 24);

  if (
    steps === null &&
    activeKcal === null &&
    exerciseMinutes === null &&
    sleepHours === null
  ) {
    return Response.json({ error: "No metrics provided." }, { status: 400 });
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("health_sync_ingest", {
    sync_token: token,
    metric_date: date,
    steps_in: steps === null ? null : Math.round(steps),
    active_kcal_in: activeKcal,
    exercise_minutes_in: exerciseMinutes === null ? null : Math.round(exerciseMinutes),
    sleep_hours_in: sleepHours,
  });

  if (error) {
    return Response.json({ error: "Sync failed." }, { status: 503 });
  }

  // An unknown token gets the same 401 as a missing one, so tokens
  // cannot be probed apart from valid ones.
  if (data !== true) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return Response.json({ ok: true, date });
}
