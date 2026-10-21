import "server-only";

import {
  rateLimitHeaders,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { checkDistributedRateLimit } from "@/lib/security/distributed-rate-limit";

export type AiRateLimitResult = RateLimitResult;

const defaultLimit = 10;
const defaultWindowSeconds = 60 * 60;

function readIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function checkAiCoachRateLimit(key: string): Promise<AiRateLimitResult> {
  const limit = readIntegerEnv("AI_COACH_RATE_LIMIT_REQUESTS", defaultLimit);
  const windowSeconds = Math.max(
    1,
    readIntegerEnv("AI_COACH_RATE_LIMIT_WINDOW_SECONDS", defaultWindowSeconds),
  );

  return checkDistributedRateLimit(key, limit, windowSeconds);
}

export { rateLimitHeaders };
