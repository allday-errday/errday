import { requireUser } from "@/lib/auth";
import { calculateDailyFlowScore } from "@/lib/daily-flow/score";
import {
  normalizeDailyScoreInsights,
  type DailyScoreInsightKey,
} from "@/lib/daily-flow/score-insights";
import { shiftDateString, todayDateString } from "@/lib/dates";
import { listCalendarEvents } from "@/lib/db/calendar";
import {
  getDailyActivityStreak,
  getDailyProfile,
  getTodayWaterTotal,
} from "@/lib/db/daily-flow";
import { getHealthMetricsForDay } from "@/lib/db/health";
import { safeRead } from "@/lib/db/safe-read";
import { getTodayDashboard } from "@/lib/db/today";
import { DailyScoreCard } from "./_components/DailyScoreCard";
import { NextUp } from "./_components/NextUp";
import { TodayHeader } from "./_components/TodayHeader";
import { WaterLogButtons } from "./_components/WaterLogButtons";
import { WeekDatePicker } from "./_components/WeekDatePicker";

const burnedCaloriesGoal = 300;

function normalizeDate(raw: string | undefined, today: string) {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  return raw > today ? today : raw;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const actualToday = todayDateString();
  const { date: rawDate } = await searchParams;
  const today = normalizeDate(rawDate, actualToday);
  const isToday = today === actualToday;
  const [dashboard, dailyProfile, waterTotalMl, healthMetrics, upcomingEvents, streak] = await Promise.all([
    getTodayDashboard(supabase, user.id, today),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
    safeRead(getTodayWaterTotal(supabase, user.id, today), 0, "water total"),
    safeRead(getHealthMetricsForDay(supabase, user.id, today), null, "health metrics"),
    safeRead(
      listCalendarEvents(supabase, user.id, today, shiftDateString(today, 7)),
      [],
      "upcoming events",
    ),
    safeRead(getDailyActivityStreak(supabase, user.id, today), 0, "activity streak"),
  ]);
  const waterTargetMl = dailyProfile?.water_goal_ml ?? 2500;
  const sleepTargetHours = dailyProfile ? Number(dailyProfile.sleep_goal_hours) : 8;
  const carbsTarget = dashboard.profile?.carbs_target_g ?? null;
  const sleepHours = dashboard.todaySleep ? Number(dashboard.todaySleep.sleep_hours) : 0;
  const burnedCalories = healthMetrics?.active_energy_kcal
    ? Math.round(Number(healthMetrics.active_energy_kcal))
    : dashboard.workoutCalories;
  const scoreResult = calculateDailyFlowScore({
    burnedCalories,
    burnedCaloriesGoal,
    caloriesConsumed: dashboard.foodTotals.calories,
    calorieTarget: dashboard.targetCalories,
    carbsG: dashboard.foodTotals.carbsG,
    carbsTargetG: carbsTarget,
    proteinG: dashboard.foodTotals.proteinG,
    proteinTargetG: dashboard.targetProtein,
    sleepHours,
    sleepTargetHours,
    waterMl: waterTotalMl,
    waterTargetMl,
  });
  const selectedInsights = normalizeDailyScoreInsights(
    dailyProfile?.daily_score_insights,
  );
  const insights = selectedInsights.map((key) =>
    scoreInsight({
      carbsTarget,
      dashboard,
      healthMetrics,
      key,
      sleepHours,
      sleepTargetHours,
      waterTargetMl,
      waterTotalMl,
    }),
  );
  const focus = dailyFocus({
    hasFood: dashboard.foodLogs.length > 0,
    sleepHours,
    waterTargetMl,
    waterTotalMl,
  });
  return (
    <div className="text-white">
      <TodayHeader isToday={isToday} />
      <WeekDatePicker date={today} key={today} today={actualToday} />
      <div className="max-w-4xl">
        <DailyScoreCard
          focus={focus}
          insights={insights}
          result={scoreResult}
          streak={streak}
        />
      </div>
      {isToday ? <div className="mt-5 max-w-4xl"><WaterLogButtons /></div> : null}
      {isToday ? <NextUp event={upcomingEvents[0] ?? null} today={today} /> : null}
    </div>
  );
}

function scoreInsight({
  carbsTarget,
  dashboard,
  healthMetrics,
  key,
  sleepHours,
  sleepTargetHours,
  waterTargetMl,
  waterTotalMl,
}: {
  carbsTarget: number | null;
  dashboard: Awaited<ReturnType<typeof getTodayDashboard>>;
  healthMetrics: Awaited<ReturnType<typeof getHealthMetricsForDay>> | null;
  key: DailyScoreInsightKey;
  sleepHours: number;
  sleepTargetHours: number;
  waterTargetMl: number;
  waterTotalMl: number;
}) {
  const values = {
    calories: {
      helper: dashboard.targetCalories ? `of ${Math.round(dashboard.targetCalories)} kcal` : "Food logged",
      label: "Calories",
      value: `${Math.round(dashboard.foodTotals.calories)} kcal`,
    },
    protein: {
      helper: dashboard.targetProtein ? `of ${Math.round(dashboard.targetProtein)} g` : "Food logged",
      label: "Protein",
      value: `${Math.round(dashboard.foodTotals.proteinG)} g`,
    },
    carbs: {
      helper: carbsTarget ? `of ${Math.round(carbsTarget)} g` : "Food logged",
      label: "Carbs",
      value: `${Math.round(dashboard.foodTotals.carbsG)} g`,
    },
    steps: {
      helper: "Today",
      label: "Steps",
      value: healthMetrics?.steps
        ? `${Math.round(healthMetrics.steps).toLocaleString("en-US")}`
        : "No steps yet",
    },
    water: {
      helper: `of ${waterTargetMl} ml`,
      label: "Water",
      value: `${waterTotalMl} ml`,
    },
    sleep: {
      helper: `Goal ${sleepTargetHours} h`,
      label: "Sleep",
      value: sleepHours ? `${sleepHours.toFixed(1)} h` : "Not logged",
    },
  } satisfies Record<DailyScoreInsightKey, { helper: string; label: string; value: string }>;

  return { ...values[key], kind: key };
}

function dailyFocus({
  hasFood,
  sleepHours,
  waterTargetMl,
  waterTotalMl,
}: {
  hasFood: boolean;
  sleepHours: number;
  waterTargetMl: number;
  waterTotalMl: number;
}) {
  if (!hasFood) return { detail: "Log your first meal", label: "Still open", state: "open" as const };
  if (waterTotalMl < waterTargetMl) {
    return { detail: "Add 250 ml of water", label: "Next", state: "open" as const };
  }
  if (!sleepHours) return { detail: "Log last night’s sleep", label: "Still open", state: "open" as const };
  return { detail: "Your key habits are covered", label: "On track", state: "complete" as const };
}
