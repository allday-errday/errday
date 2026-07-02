import { requireUser } from "@/lib/auth";
import { detectDayType } from "@/lib/daily-flow/plan";
import { generateDailyPlan } from "@/lib/daily-flow/plan";
import { calculateDailyFlowScore } from "@/lib/daily-flow/score";
import { todayDateString } from "@/lib/dates";
import { listCalendarEvents } from "@/lib/db/calendar";
import {
  getDailyProfile,
  getDaySetting,
  getTodayWaterTotal,
} from "@/lib/db/daily-flow";
import { getHealthMetricsForDay } from "@/lib/db/health";
import { safeRead } from "@/lib/db/safe-read";
import { getTodayDashboard } from "@/lib/db/today";
import { DailyPlanTimeline } from "./_components/DailyPlanTimeline";
import { DailyScoreCard } from "./_components/DailyScoreCard";
import { DailyStatsGrid, type DailyStat } from "./_components/DailyStatsGrid";
import { QuickActionsGrid } from "./_components/QuickActionsGrid";
import { TodayHeader } from "./_components/TodayHeader";
import { UpcomingEvents } from "./_components/UpcomingEvents";
import { WaterLogButtons } from "./_components/WaterLogButtons";

const burnedCaloriesGoal = 300;
const stepsGoal = 10_000;

export default async function TodayPage() {
  const { supabase, user } = await requireUser();
  const today = todayDateString();
  const upcomingEnd = new Date(`${today}T00:00:00Z`);
  upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + 7);
  const [
    dashboard,
    dailyProfile,
    daySetting,
    waterTotalMl,
    upcomingEvents,
    healthMetrics,
  ] = await Promise.all([
    getTodayDashboard(supabase, user.id),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
    safeRead(getDaySetting(supabase, user.id, today), null, "day setting"),
    safeRead(getTodayWaterTotal(supabase, user.id, today), 0, "water total"),
    safeRead(
      listCalendarEvents(
        supabase,
        user.id,
        today,
        upcomingEnd.toISOString().slice(0, 10),
      ),
      [],
      "upcoming events",
    ),
    safeRead(
      getHealthMetricsForDay(supabase, user.id, today),
      null,
      "health metrics",
    ),
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
  const fatTarget = dashboard.profile?.fat_target_g ?? null;
  const sleepHours = dashboard.todaySleep
    ? Number(dashboard.todaySleep.sleep_hours)
    : 0;
  // The watch's active energy already includes workouts, so it wins when synced.
  const burnedCalories = healthMetrics?.active_energy_kcal
    ? Math.round(Number(healthMetrics.active_energy_kcal))
    : dashboard.workoutCalories;
  const steps = healthMetrics?.steps ?? null;
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
      progress: burnedCalories / burnedCaloriesGoal,
      value: `${burnedCalories.toLocaleString("en-US")}`,
      helper: healthMetrics?.active_energy_kcal
        ? "kcal · Apple Health"
        : `/ ${burnedCaloriesGoal} kcal goal`,
    },
    {
      icon: "steps",
      label: "Steps",
      progress: steps !== null ? steps / stepsGoal : 0,
      value: steps !== null ? steps.toLocaleString("en-US") : "—",
      helper:
        steps !== null
          ? `/ ${stepsGoal.toLocaleString("en-US")} goal`
          : "Connect Apple Health",
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
      icon: "fat",
      label: "Fat",
      progress: fatTarget && fatTarget > 0 ? dashboard.foodTotals.fatG / fatTarget : 0,
      value: `${Math.round(dashboard.foodTotals.fatG)} g`,
      helper: fatTarget ? `/ ${fatTarget} g` : "Set target",
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
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
        <DailyScoreCard result={scoreResult} />
        <QuickActionsGrid />
      </div>
      <DailyStatsGrid stats={stats} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="min-w-0">
          <DailyPlanTimeline dayType={plan.dayType} items={plan.items} />
        </div>
        <aside className="grid gap-5">
          <WaterLogButtons />
          <UpcomingEvents events={upcomingEvents.slice(0, 3)} today={today} />
        </aside>
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
