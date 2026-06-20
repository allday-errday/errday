import { requireUser } from "@/lib/auth";
import { detectDayType } from "@/lib/daily-flow/plan";
import { generateDailyPlan } from "@/lib/daily-flow/plan";
import { calculateDailyFlowScore } from "@/lib/daily-flow/score";
import { todayDateString } from "@/lib/dates";
import {
  getDailyProfile,
  getDaySetting,
  getTodayWaterTotal,
} from "@/lib/db/daily-flow";
import { safeRead } from "@/lib/db/safe-read";
import { getTodayDashboard } from "@/lib/db/today";
import { DailyPlanTimeline } from "./_components/DailyPlanTimeline";
import { DailyScoreCard } from "./_components/DailyScoreCard";
import { DailyStatsGrid, type DailyStat } from "./_components/DailyStatsGrid";
import { QuickActionsGrid } from "./_components/QuickActionsGrid";
import { TodayHeader } from "./_components/TodayHeader";
import { WaterLogButtons } from "./_components/WaterLogButtons";

const burnedCaloriesGoal = 300;

export default async function TodayPage() {
  const { supabase, user } = await requireUser();
  const today = todayDateString();
  const [dashboard, dailyProfile, daySetting, waterTotalMl] = await Promise.all([
    getTodayDashboard(supabase, user.id),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
    safeRead(getDaySetting(supabase, user.id, today), null, "day setting"),
    safeRead(getTodayWaterTotal(supabase, user.id, today), 0, "water total"),
  ]);
  const waterTargetMl = dailyProfile?.water_goal_ml ?? 2500;
  const sleepTargetHours = dailyProfile
    ? Number(dailyProfile.sleep_goal_hours)
    : 8;
  const inferredDayType = detectDayType({
    workoutLogs: dashboard.workoutLogs,
    workouts: dashboard.workouts,
  });
  const dayType = daySetting?.day_type ?? inferredDayType;
  const carbsTarget =
    dashboard.nutritionTarget?.daily_calorie_target && dashboard.targetProtein
      ? dashboard.profile?.carbs_target_g ?? null
      : dashboard.profile?.carbs_target_g ?? null;
  const sleepHours = dashboard.todaySleep
    ? Number(dashboard.todaySleep.sleep_hours)
    : 0;
  const scoreResult = calculateDailyFlowScore({
    burnedCalories: dashboard.workoutCalories,
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
  const plan = generateDailyPlan({
    dayType,
    foodLogs: dashboard.foodLogs,
    sleepLog: dashboard.todaySleep,
    suggestedBedtime: dailyProfile?.suggested_bedtime,
    workoutLogs: dashboard.workoutLogs,
    workouts: dashboard.workouts,
  });
  const stats: DailyStat[] = [
    {
      icon: "calories",
      label: "Calories",
      progress:
        dashboard.targetCalories && dashboard.targetCalories > 0
          ? dashboard.foodTotals.calories / dashboard.targetCalories
          : 0,
      value: `${dashboard.foodTotals.calories.toLocaleString("en-US")}`,
      helper: dashboard.targetCalories
        ? `/ ${dashboard.targetCalories.toLocaleString("en-US")} kcal`
        : "Set target",
    },
    {
      icon: "burned",
      label: "Burned",
      progress: dashboard.workoutCalories / burnedCaloriesGoal,
      value: `${dashboard.workoutCalories.toLocaleString("en-US")}`,
      helper: `/ ${burnedCaloriesGoal} kcal goal`,
    },
    {
      icon: "protein",
      label: "Protein",
      progress:
        dashboard.targetProtein && dashboard.targetProtein > 0
          ? dashboard.foodTotals.proteinG / dashboard.targetProtein
          : 0,
      value: `${Math.round(dashboard.foodTotals.proteinG)} g`,
      helper: dashboard.targetProtein ? `/ ${dashboard.targetProtein} g` : "Set target",
    },
    {
      icon: "carbs",
      label: "Carbs",
      progress: carbsTarget && carbsTarget > 0 ? dashboard.foodTotals.carbsG / carbsTarget : 0,
      value: `${Math.round(dashboard.foodTotals.carbsG)} g`,
      helper: carbsTarget ? `/ ${carbsTarget} g` : "Set target",
    },
    {
      icon: "water",
      label: "Water",
      progress: waterTotalMl / waterTargetMl,
      value: `${waterTotalMl.toLocaleString("en-US")} ml`,
      helper: `/ ${waterTargetMl.toLocaleString("en-US")} ml`,
    },
    {
      icon: "sleep",
      label: "Sleep",
      progress: sleepHours / sleepTargetHours,
      value: dashboard.todaySleep ? `${sleepHours}h` : "0h",
      helper: `/ ${sleepTargetHours}h target`,
    },
  ];

  return (
    <div className="text-white">
      <TodayHeader dateLabel={formatLocalDate(new Date())} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <DailyScoreCard result={scoreResult} />
          <DailyStatsGrid stats={stats} />
          <WaterLogButtons />
          <QuickActionsGrid />
        </div>
        <div className="min-w-0">
          <DailyPlanTimeline dayType={plan.dayType} items={plan.items} />
        </div>
      </div>
    </div>
  );
}

function formatLocalDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
