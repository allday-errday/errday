import type {
  FoodLogWithItem,
  PlanSlot,
  PlanStatus,
  SleepLog,
  WorkoutLogWithTemplate,
  WorkoutWithSets,
} from "@/types/database";

export type { DayType, MealSlot, PlanSlot, PlanStatus } from "@/types/database";

export const DAILY_FLOW_ACCENT = "var(--accent)";

export type DailyScoreStatus = "Poor" | "Okay" | "Good" | "Great" | "Amazing";

export type PlanItemStatus = PlanStatus;

export type PlanItemKind = "meal" | "workout" | "sleep";

export type DailyPlanSlot = PlanSlot;

export type DailyPlanItem = {
  detail: string;
  href: string;
  kind: PlanItemKind;
  label: string;
  slot: DailyPlanSlot;
  status: PlanItemStatus;
  targetTime: string;
  targetKcal?: number | null;
};

export type DailyFlowFoodLog = Pick<
  FoodLogWithItem,
  "calories" | "display_name" | "logged_at" | "food_items"
>;

export type DailyFlowWorkoutLog = Pick<
  WorkoutLogWithTemplate,
  "calories_burned" | "logged_at" | "name"
>;

export type DailyFlowWorkout = Pick<WorkoutWithSets, "created_at" | "name">;

export type DailyFlowSleepLog = Pick<SleepLog, "sleep_hours" | "date">;
