import type {
  DailyFlowFoodLog,
  DailyFlowSleepLog,
  DailyFlowWorkout,
  DailyFlowWorkoutLog,
  DailyPlanItem,
  DailyPlanSlot,
  DayType,
  PlanItemStatus,
} from "./types";
import type { MealSlot } from "@/types/database";

const targetTimes: Record<DailyPlanSlot, string> = {
  breakfast: "10:00",
  lunch: "13:00",
  pre_workout: "14:30",
  workout: "16:00",
  post_workout: "17:30",
  dinner: "19:30",
  snack: "21:00",
  sleep: "22:30",
};

const slotLabels: Record<DailyPlanSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  pre_workout: "Pre-Workout Meal",
  workout: "Workout",
  post_workout: "Post-Workout Meal",
  dinner: "Dinner",
  snack: "Snack",
  sleep: "Sleep",
};

const slotHrefs: Record<DailyPlanSlot, string> = {
  breakfast: "/food/search?slot=breakfast",
  lunch: "/food/search?slot=lunch",
  pre_workout: "/food/search?slot=pre_workout",
  workout: "/gym",
  post_workout: "/food/search?slot=post_workout",
  dinner: "/food/search?slot=dinner",
  snack: "/food/search?slot=snack",
  sleep: "/sleep",
};

export type GenerateDailyPlanInput = {
  dayType?: DayType;
  foodLogs: DailyFlowFoodLog[];
  now?: Date;
  suggestedBedtime?: string | null;
  sleepLog?: DailyFlowSleepLog | null;
  workoutLogs: DailyFlowWorkoutLog[];
  workouts: DailyFlowWorkout[];
};

function dateAtTime(base: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function statusForSlot(now: Date, targetTime: string, logged: boolean): PlanItemStatus {
  if (logged) {
    return "logged";
  }

  return now.getTime() > dateAtTime(now, targetTime).getTime() ? "missed" : "upcoming";
}

function sortByTime<T extends { logged_at?: string; created_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const left = getItemTime(a);
    const right = getItemTime(b);
    return left - right;
  });
}

function getItemTime(item: { logged_at?: string; created_at?: string }) {
  return new Date(item.logged_at ?? item.created_at ?? 0).getTime();
}

function getFoodDetail(log?: DailyFlowFoodLog) {
  if (!log) {
    return "Ready to log";
  }

  return `${log.display_name ?? log.food_items?.name ?? "Meal"} - ${log.calories} kcal`;
}

function createPlanItem(
  slot: DailyPlanSlot,
  status: PlanItemStatus,
  detail: string,
): DailyPlanItem {
  return {
    detail,
    href: slotHrefs[slot],
    kind: slot === "workout" ? "workout" : slot === "sleep" ? "sleep" : "meal",
    label: slotLabels[slot],
    slot,
    status,
    targetTime: targetTimes[slot],
  };
}

export function detectDayType(input: Pick<GenerateDailyPlanInput, "workoutLogs" | "workouts">): DayType {
  return input.workoutLogs.length > 0 || input.workouts.length > 0 ? "gym" : "rest";
}

export function generateDailyPlan(input: GenerateDailyPlanInput) {
  const now = input.now ?? new Date();
  const dayType = input.dayType ?? detectDayType(input);
  const meals = sortByTime(input.foodLogs);
  const workouts = sortByTime([...input.workoutLogs, ...input.workouts]);
  const workoutAnchor = workouts[0];
  const workoutTime = workoutAnchor ? getItemTime(workoutAnchor) : null;
  const sleepTargetTime = input.suggestedBedtime?.slice(0, 5) ?? targetTimes.sleep;

  if (dayType === "rest") {
    const slots: DailyPlanSlot[] = ["breakfast", "lunch", "dinner", "snack", "sleep"];

    return {
      dayType,
      items: slots.map((slot, index) => {
        if (slot === "sleep") {
          return createPlanItem(
            slot,
            statusForSlot(now, sleepTargetTime, Boolean(input.sleepLog)),
            input.sleepLog ? `${Number(input.sleepLog.sleep_hours)}h logged` : "Suggested bedtime",
          );
        }

        const meal = slot === "snack" ? meals[3] : meals[index];
        return createPlanItem(
          slot,
          statusForSlot(now, targetTimes[slot], Boolean(meal)),
          getFoodDetail(meal),
        );
      }),
    };
  }

  const firstMeal = meals[0];
  const mealsBeforeWorkout =
    workoutTime === null ? [] : meals.filter((meal) => new Date(meal.logged_at).getTime() < workoutTime);
  const mealsAfterWorkout =
    workoutTime === null ? [] : meals.filter((meal) => new Date(meal.logged_at).getTime() >= workoutTime);
  const preWorkoutMeal = mealsBeforeWorkout.find((meal) => meal !== firstMeal) ?? meals[1];
  const postWorkoutMeal = mealsAfterWorkout[0] ?? meals[2];
  const dinnerMeal = meals.find((meal) => {
    const hour = new Date(meal.logged_at).getHours();
    return hour >= 18 && meal !== postWorkoutMeal;
  }) ?? meals[3];

  const slotMeals: Partial<Record<DailyPlanSlot, DailyFlowFoodLog | undefined>> = {
    breakfast: firstMeal,
    pre_workout: preWorkoutMeal,
    post_workout: postWorkoutMeal,
    dinner: dinnerMeal,
  };
  const slots: DailyPlanSlot[] = [
    "breakfast",
    "pre_workout",
    "workout",
    "post_workout",
    "dinner",
    "sleep",
  ];

  return {
    dayType,
    items: slots.map((slot) => {
      if (slot === "workout") {
        const logged = input.workoutLogs.length > 0 || input.workouts.length > 0;
        const workout = input.workoutLogs[0] ?? input.workouts[0];
        const detail = workout
          ? `${workout.name ?? "Workout"} logged`
          : "Planned training block";
        return createPlanItem(slot, statusForSlot(now, targetTimes.workout, logged), detail);
      }

      if (slot === "sleep") {
        return createPlanItem(
          slot,
          statusForSlot(now, sleepTargetTime, Boolean(input.sleepLog)),
          input.sleepLog ? `${Number(input.sleepLog.sleep_hours)}h logged` : "Suggested bedtime",
        );
      }

      const meal = slotMeals[slot];
      return createPlanItem(
        slot,
        statusForSlot(now, targetTimes[slot], Boolean(meal)),
        getFoodDetail(meal),
      );
    }),
  };
}

export function inferNextMealSlot(input: {
  dayType: DayType;
  foodLogs: DailyFlowFoodLog[];
  now?: Date;
  workoutLogs: DailyFlowWorkoutLog[];
  workouts: DailyFlowWorkout[];
}): MealSlot {
  const now = input.now ?? new Date();
  const existing = sortByTime(input.foodLogs);

  if (input.dayType === "rest") {
    const restSlots: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
    return restSlots[Math.min(existing.length, restSlots.length - 1)];
  }

  const workouts = sortByTime([...input.workoutLogs, ...input.workouts]);
  const workoutAnchor = workouts[0];
  const workoutTime = workoutAnchor ? getItemTime(workoutAnchor) : null;

  if (existing.length === 0) {
    return "breakfast";
  }

  if (workoutTime) {
    const nowTime = now.getTime();
    const beforeWorkout = nowTime < workoutTime;
    const hasPreWorkout = existing.some((meal) => {
      return new Date(meal.logged_at).getTime() < workoutTime && meal !== existing[0];
    });
    const hasPostWorkout = existing.some((meal) => {
      return new Date(meal.logged_at).getTime() >= workoutTime;
    });

    if (beforeWorkout && !hasPreWorkout) {
      return "pre_workout";
    }

    if (!beforeWorkout && !hasPostWorkout) {
      return "post_workout";
    }
  }

  const hour = now.getHours();

  if (hour >= 18) {
    return "dinner";
  }

  if (existing.length === 1) {
    return "pre_workout";
  }

  if (existing.length === 2) {
    return "post_workout";
  }

  return "snack";
}
