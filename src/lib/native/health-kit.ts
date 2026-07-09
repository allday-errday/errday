"use client";

import { registerPlugin } from "@capacitor/core";
import { isNativeIosApp } from "@/lib/native/capacitor";

type HealthKitMetrics = {
  active_energy_kcal: number | null;
  date: string;
  exercise_minutes: number | null;
  sleep_hours: number | null;
  steps: number | null;
};

type HealthKitPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  readDailyMetrics(options?: { date?: string }): Promise<HealthKitMetrics>;
  requestAuthorization(): Promise<{ authorized: boolean }>;
};

const ErrdayHealthKit = registerPlugin<HealthKitPlugin>("ErrdayHealthKit");

export function supportsNativeHealthKit() {
  return isNativeIosApp();
}

export async function syncNativeHealthKitMetrics({
  date = todayDateString(),
  endpoint,
  token,
}: {
  date?: string;
  endpoint: string;
  token: string;
}) {
  if (!supportsNativeHealthKit()) {
    return { ok: false, reason: "unsupported" as const };
  }

  const availability = await ErrdayHealthKit.isAvailable();
  if (!availability.available) {
    return { ok: false, reason: "unavailable" as const };
  }

  await ErrdayHealthKit.requestAuthorization();
  const metrics = await ErrdayHealthKit.readDailyMetrics({ date });

  const response = await fetch(endpoint, {
    body: JSON.stringify(metrics),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return { metrics, ok: true as const };
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}
