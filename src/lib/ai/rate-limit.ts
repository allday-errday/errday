import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

export type AiRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();
const defaultLimit = 10;
const defaultWindowSeconds = 60 * 60;
let nextCleanupAt = 0;

function readIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function cleanupExpiredBuckets(now: number) {
  if (now < nextCleanupAt) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  nextCleanupAt = now + 60_000;
}

export function checkAiCoachRateLimit(key: string, now = Date.now()): AiRateLimitResult {
  const limit = readIntegerEnv("AI_COACH_RATE_LIMIT_REQUESTS", defaultLimit);
  const windowSeconds = Math.max(
    1,
    readIntegerEnv("AI_COACH_RATE_LIMIT_WINDOW_SECONDS", defaultWindowSeconds),
  );
  const windowMs = windowSeconds * 1_000;

  cleanupExpiredBuckets(now);

  if (limit === 0) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: now + windowMs,
      retryAfterSeconds: windowSeconds,
    };
  }

  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };

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

export function rateLimitHeaders(result: AiRateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };
}
