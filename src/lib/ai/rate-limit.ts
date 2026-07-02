import "server-only";

import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

export type AiRateLimitResult = RateLimitResult;

const defaultLimit = 10;
const defaultWindowSeconds = 60 * 60;

function readIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function checkAiCoachRateLimit(key: string, now = Date.now()): AiRateLimitResult {
  const limit = readIntegerEnv("AI_COACH_RATE_LIMIT_REQUESTS", defaultLimit);
  const windowSeconds = Math.max(
    1,
    readIntegerEnv("AI_COACH_RATE_LIMIT_WINDOW_SECONDS", defaultWindowSeconds),
  );

  return checkRateLimit(key, limit, windowSeconds, now);
}

export { rateLimitHeaders };
