import { requireUser } from "@/lib/auth";
import { calculateDailyFlowScore } from "@/lib/daily-flow/score";
import { todayDateString } from "@/lib/dates";
import { getDailyProfile, getTodayWaterTotal } from "@/lib/db/daily-flow";
import { getHealthMetricsForDay } from "@/lib/db/health";
import { safeRead } from "@/lib/db/safe-read";
import { getTodayDashboard } from "@/lib/db/today";
import { DailyScoreCard } from "./_components/DailyScoreCard";
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
  const [dashboard, dailyProfile, waterTotalMl, healthMetrics] = await Promise.all([
    getTodayDashboard(supabase, user.id, today),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
    safeRead(getTodayWaterTotal(supabase, user.id, today), 0, "water total"),
    safeRead(getHealthMetricsForDay(supabase, user.id, today), null, "health metrics"),
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
  return (
    <div className="text-white">
      <TodayHeader isToday={isToday} />
      <WeekDatePicker date={today} key={today} today={actualToday} />
      <div className="max-w-4xl">
        <DailyScoreCard result={scoreResult} />
      </div>
      {isToday ? <div className="mt-5 max-w-4xl"><WaterLogButtons /></div> : null}
    </div>
  );
}
