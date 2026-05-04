import type { DailyScoreStatus } from "./types";

export type DailyScoreInput = {
  burnedCalories: number;
  burnedCaloriesGoal?: number | null;
  caloriesConsumed: number;
  calorieTarget?: number | null;
  carbsG: number;
  carbsTargetG?: number | null;
  proteinG: number;
  proteinTargetG?: number | null;
  sleepHours: number;
  sleepTargetHours?: number | null;
  waterMl: number;
  waterTargetMl?: number | null;
};

export type DailyScoreBreakdown = {
  burnedCalories: number;
  calories: number;
  carbs: number;
  protein: number;
  sleep: number;
  water: number;
};

export type DailyScoreResult = {
  breakdown: DailyScoreBreakdown;
  message: string;
  score: number;
  status: DailyScoreStatus;
};

const weights: Record<keyof DailyScoreBreakdown, number> = {
  calories: 0.3,
  protein: 0.2,
  carbs: 0.1,
  sleep: 0.2,
  burnedCalories: 0.1,
  water: 0.1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percentageScore(value: number, target?: number | null) {
  if (!target || target <= 0) {
    return value > 0 ? 50 : 0;
  }

  return clamp((value / target) * 100, 0, 100);
}

function calorieScore(consumed: number, target?: number | null) {
  if (!target || target <= 0) {
    return consumed > 0 ? 50 : 0;
  }

  const ratio = consumed / target;

  if (ratio <= 1) {
    return clamp(ratio * 100, 0, 100);
  }

  if (ratio <= 1.1) {
    return clamp(100 - ((ratio - 1) / 0.1) * 20, 0, 100);
  }

  if (ratio <= 1.25) {
    return clamp(80 - ((ratio - 1.1) / 0.15) * 60, 0, 100);
  }

  return 20;
}

export function getDailyScoreStatus(score: number): DailyScoreStatus {
  if (score >= 90) return "Amazing";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Okay";
  return "Poor";
}

function getStatusMessage(status: DailyScoreStatus) {
  const messages: Record<DailyScoreStatus, string> = {
    Poor: "Start with one small log and build the day from there.",
    Okay: "You have a base. A meal, water, or sleep log can lift the day.",
    Good: "The day is taking shape. Keep the next step simple.",
    Great: "Strong flow today. Your key targets are lining up.",
    Amazing: "Excellent day. Recovery, fuel, and movement are dialed in.",
  };

  return messages[status];
}

export function calculateDailyFlowScore(input: DailyScoreInput): DailyScoreResult {
  const breakdown: DailyScoreBreakdown = {
    calories: calorieScore(input.caloriesConsumed, input.calorieTarget),
    protein: percentageScore(input.proteinG, input.proteinTargetG),
    carbs: percentageScore(input.carbsG, input.carbsTargetG),
    sleep: percentageScore(input.sleepHours, input.sleepTargetHours ?? 8),
    burnedCalories: percentageScore(
      input.burnedCalories,
      input.burnedCaloriesGoal ?? 300,
    ),
    water: percentageScore(input.waterMl, input.waterTargetMl ?? 2500),
  };

  const weightedScore = Object.entries(breakdown).reduce((sum, [key, value]) => {
    return sum + value * weights[key as keyof DailyScoreBreakdown];
  }, 0);
  const score = clamp(Math.round(weightedScore), 1, 100);
  const status = getDailyScoreStatus(score);

  return {
    breakdown,
    message: getStatusMessage(status),
    score,
    status,
  };
}
