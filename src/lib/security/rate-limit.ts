import "server-only";

import { headers } from "next/headers";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

// Fixed-window in-memory limiter. Per serverless instance, so treat it as a
// best-effort brake on top of Supabase's own auth rate limits, not a guarantee.
const buckets = new Map<string, Bucket>();
let nextCleanupAt = 0;

function cleanupExpiredBuckets(now: number) {
  if (now < nextCleanupAt) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  nextCleanupAt = now + 60_000;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  now = Date.now(),
): RateLimitResult {
  const windowMs = Math.max(1, windowSeconds) * 1_000;

  cleanupExpiredBuckets(now);

  if (limit <= 0) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: now + windowMs,
      retryAfterSeconds: Math.max(1, windowSeconds),
    };
  }

  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };

  if (bucket.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };
}

export function clientIpFromHeaders(headerList: Headers) {
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return headerList.get("x-real-ip")?.trim() || "unknown";
}

export async function getClientIp() {
  return clientIpFromHeaders(await headers());
}
