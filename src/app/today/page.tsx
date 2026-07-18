import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { detectDayType, generateDailyPlan } from "@/lib/daily-flow/plan";
import { parsePlanTimes, PLAN_TIMES_COOKIE } from "@/lib/daily-flow/plan-times";
import { calculateDailyFlowScore } from "@/lib/daily-flow/score";
import { todayDateString } from "@/lib/dates";
import { getDailyProfile, getDaySetting, getTodayWaterTotal } from "@/lib/db/daily-flow";
import { getHealthMetricsForDay } from "@/lib/db/health";
import { safeRead } from "@/lib/db/safe-read";
import { getTodayDashboard } from "@/lib/db/today";
import { DailyPlanTimeline } from "./_components/DailyPlanTimeline";
import { DailyScoreCard } from "./_components/DailyScoreCard";
import { DaySwipeNavigator } from "./_components/DaySwipeNavigator";
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
  const [dashboard, dailyProfile, daySetting, waterTotalMl, healthMetrics, cookieStore] = await Promise.all([
    getTodayDashboard(supabase, user.id, today),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
    safeRead(getDaySetting(supabase, user.id, today), null, "day setting"),
    safeRead(getTodayWaterTotal(supabase, user.id, today), 0, "water total"),
    safeRead(getHealthMetricsForDay(supabase, user.id, today), null, "health metrics"),
    cookies(),
  ]);
  const planTimes = parsePlanTimes(cookieStore.get(PLAN_TIMES_COOKIE)?.value);
  const waterTargetMl = dailyProfile?.water_goal_ml ?? 2500;
  const sleepTargetHours = dailyProfile ? Number(dailyProfile.sleep_goal_hours) : 8;
  const inferredDayType = detectDayType({
    workoutLogs: dashboard.workoutLogs,
    workouts: dashboard.workouts,
  });
  const dayType = daySetting?.day_type ?? inferredDayType;
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
  const plan = generateDailyPlan({
    dayType,
    foodLogs: dashboard.foodLogs,
    now: isToday ? undefined : new Date(`${today}T23:59:59`),
    planTimes,
    sleepLog: dashboard.todaySleep,
    suggestedBedtime: dailyProfile?.suggested_bedtime,
    workoutLogs: dashboard.workoutLogs,
    workouts: dashboard.workouts,
    calorieTarget: dashboard.targetCalories,
    burnedCalories,
  });

  return (
    <DaySwipeNavigator date={today} today={actualToday}>
      <div className="text-white">
        <TodayHeader isToday={isToday} />
        <WeekDatePicker date={today} today={actualToday} />
        <div className="max-w-4xl">
          <DailyScoreCard result={scoreResult} />
        </div>
        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <div className="min-w-0">
            <DailyPlanTimeline dayType={plan.dayType} items={plan.items} />
          </div>
          <aside>{isToday ? <WaterLogButtons /> : null}</aside>
        </div>
      </div>
    </DaySwipeNavigator>
  );
}
