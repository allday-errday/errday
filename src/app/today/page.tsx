import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { QuickActionButton } from "@/components/quick-action-button";
import { StatCard } from "@/components/stat-card";
import { requireUser } from "@/lib/auth";
import { getTodayDashboard } from "@/lib/db/today";

const quickActions = [
  { label: "Log Meal", href: "/food" },
  { label: "Start Workout", href: "/gym" },
  { label: "Add Journal", href: "/journal" },
  { label: "Log Weight", href: "/settings" },
];

export default async function TodayPage() {
  const { supabase, user } = await requireUser();
  const dashboard = await getTodayDashboard(supabase, user.id);
  const calorieTarget = dashboard.profile?.calorie_target ?? 0;
  const caloriesRemaining = calorieTarget - dashboard.foodTotals.calories;
  const score = calculateDailyScore({
    hasProfile: Boolean(dashboard.profile),
    hasFood: dashboard.foodEntries.length > 0,
    hasSleep: Boolean(dashboard.todaySleep),
    hasJournal: Boolean(dashboard.todayJournal),
    hasWorkout: dashboard.workouts.length > 0,
  });
  const stats = [
    {
      label: "Calories",
      value: `${dashboard.foodTotals.calories.toLocaleString("en-US")}`,
      helper: calorieTarget ? `/ ${calorieTarget.toLocaleString("en-US")} kcal` : "Set target",
    },
    {
      label: "Protein",
      value: `${Math.round(dashboard.foodTotals.proteinG)} g`,
      helper: dashboard.profile?.protein_target_g
        ? `/ ${dashboard.profile.protein_target_g} g`
        : "Set target",
    },
    {
      label: "Sleep",
      value: dashboard.todaySleep
        ? `${Number(dashboard.todaySleep.sleep_hours)}h`
        : "-",
      helper: dashboard.todaySleep ? "Latest log" : "No sleep log",
    },
    {
      label: "Body weight",
      value: dashboard.latestWeight
        ? `${Number(dashboard.latestWeight.weight_kg)} kg`
        : dashboard.profile?.current_weight_kg
          ? `${Number(dashboard.profile.current_weight_kg)} kg`
          : "-",
      helper: dashboard.latestWeight ? "Latest entry" : "No log yet",
    },
  ];
  const overviewItems = [
    {
      title: "Training",
      detail:
        dashboard.workouts.length > 0
          ? `${dashboard.workouts.length} workout logged today`
          : "No workout logged today",
      href: "/gym",
    },
    {
      title: "Food",
      detail: calorieTarget
        ? `${caloriesRemaining.toLocaleString("en-US")} kcal remaining`
        : "Set your profile targets",
      href: calorieTarget ? "/food" : "/settings",
    },
    {
      title: "Sleep",
      detail: dashboard.todaySleep
        ? `Quality ${dashboard.todaySleep.quality ?? "-"} / 5`
        : "No sleep log yet",
      href: "/sleep",
    },
    {
      title: "Journal",
      detail: dashboard.todayJournal ? "Written today" : "Not written yet",
      href: "/journal",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 pt-1">
        <PageHeader title="Errday" subtitle="All day. Errday." />
        <Link
          className="mt-1 inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm shadow-zinc-200/70 transition hover:border-fuchsia-200 hover:bg-fuchsia-50"
          href="/settings#reminder-settings"
        >
          Settings
        </Link>
      </div>

      <section className="mb-7 rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 p-5 shadow-lg shadow-fuchsia-100/60">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-fuchsia-700">Today Score</p>
            <p className="mt-2 text-6xl font-black tracking-normal text-zinc-900">
              {score}
            </p>
          </div>
          <div className="mb-2 rounded-full bg-[#d946ef] px-3 py-1 text-xs font-bold text-black">
            Live
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          {score >= 80
            ? "Solid day. Keep the streak alive."
            : "Log the basics and let the day come into focus."}
        </p>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">
          Stats
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <StatCard
              helper={stat.helper}
              key={stat.label}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionButton
              href={action.href}
              key={action.label}
              label={action.label}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">
          Daily Overview
        </h2>
        <div className="space-y-3">
          {overviewItems.map((item) => (
            <Link
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/60 transition hover:border-fuchsia-200 hover:shadow-md hover:shadow-fuchsia-100/60"
              href={item.href}
              key={item.title}
            >
              <div>
                <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{item.detail}</p>
              </div>
              <span className="size-2 rounded-full bg-[#d946ef]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function calculateDailyScore(input: {
  hasProfile: boolean;
  hasFood: boolean;
  hasSleep: boolean;
  hasJournal: boolean;
  hasWorkout: boolean;
}) {
  let score = 20;

  if (input.hasProfile) score += 20;
  if (input.hasFood) score += 20;
  if (input.hasSleep) score += 20;
  if (input.hasJournal) score += 10;
  if (input.hasWorkout) score += 10;

  return score;
}
