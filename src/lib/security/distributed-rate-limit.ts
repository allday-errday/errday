import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { RateLimitResult } from "@/lib/security/rate-limit";

type RateLimitRow = {
  allowed: boolean;
  limit_value: number;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number;
};

export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_server_rate_limit", {
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(`Distributed rate limit failed: ${error.message}`);
  }

  const row = (data as unknown as RateLimitRow[] | null)?.[0];
  const resetAt = row ? Date.parse(row.reset_at) : Number.NaN;
  if (!row || !Number.isFinite(resetAt)) {
    throw new Error("Distributed rate limit returned an invalid response.");
  }

  return {
    allowed: row.allowed,
    limit: row.limit_value,
    remaining: row.remaining,
    resetAt,
    retryAfterSeconds: row.retry_after_seconds,
  };
}
