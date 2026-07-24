import { requireUser } from "@/lib/auth";
import { calculateDailyFlowScore } from "@/lib/daily-flow/score";
import { shiftDateString, todayDateString } from "@/lib/dates";
import { listCalendarEvents } from "@/lib/db/calendar";
import { getDailyProfile, getTodayWaterTotal } from "@/lib/db/daily-flow";
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
  const [dashboard, dailyProfile, waterTotalMl, healthMetrics, upcomingEvents] = await Promise.all([
    getTodayDashboard(supabase, user.id, today),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
    safeRead(getTodayWaterTotal(supabase, user.id, today), 0, "water total"),
    safeRead(getHealthMetricsForDay(supabase, user.id, today), null, "health metrics"),
    safeRead(
      listCalendarEvents(supabase, user.id, today, shiftDateString(today, 7)),
      [],
      "upcoming events",
    ),
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
        <DailyScoreCard
          insights={[
            {
              helper: dashboard.targetCalories
                ? `of ${Math.round(dashboard.targetCalories)} kcal`
                : "Food logged",
              kind: "food",
              label: "Food",
              value: `${Math.round(dashboard.foodTotals.calories)} kcal`,
            },
            {
              helper: "Today",
              kind: "move",
              label: "Move",
              value: healthMetrics?.steps
                ? `${Math.round(healthMetrics.steps).toLocaleString("en-US")} steps`
                : "No steps yet",
            },
            {
              helper: sleepTargetHours ? `Goal ${sleepTargetHours} h` : "Sleep",
              kind: "recover",
              label: "Recover",
              value: sleepHours ? `${sleepHours.toFixed(1)} h` : "No sleep logged",
            },
          ]}
          result={scoreResult}
        />
      </div>
      {isToday ? <div className="mt-5 max-w-4xl"><WaterLogButtons /></div> : null}
      {isToday ? <NextUp event={upcomingEvents[0] ?? null} today={today} /> : null}
    </div>
  );
}
