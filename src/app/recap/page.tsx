import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getMonthlyRecap, type MonthlyRecap } from "@/lib/db/recap";

export const metadata = {
  title: "Monthly recap",
};

export default async function RecapPage() {
  const { supabase, user } = await requireUser();
  const recap = await getMonthlyRecap(supabase, user.id);
  const insights = buildInsights(recap);

  return (
    <div>
      <PageHeader
        subtitle="Your last 30 days at a glance — and where the next percent lives."
        title="Monthly recap"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <RecapTile
          label="Avg calories"
          note={
            recap.profile?.calorie_target
              ? `Target ${recap.profile.calorie_target} kcal`
              : "Set a target in Settings"
          }
          value={
            recap.avgCalories === null
              ? "—"
              : `${Math.round(recap.avgCalories)} kcal`
          }
        />
        <RecapTile
          label="Avg protein"
          note={
            recap.profile?.protein_target_g
              ? `Target ${recap.profile.protein_target_g} g`
              : "Logged days only"
          }
          value={
            recap.avgProteinG === null
              ? "—"
              : `${Math.round(recap.avgProteinG)} g`
          }
        />
        <RecapTile
          label="Avg steps"
          note={recap.avgSteps === null ? "Connect Apple Health" : "Per synced day"}
          value={
            recap.avgSteps === null
              ? "—"
              : Math.round(recap.avgSteps).toLocaleString("en-US")
          }
        />
        <RecapTile
          label="Avg sleep"
          note={`${recap.sleepNights} nights logged`}
          value={
            recap.avgSleepHours === null
              ? "—"
              : `${recap.avgSleepHours.toFixed(1)} h`
          }
        />
        <RecapTile
          label="Workouts"
          note={`${Math.round(recap.totalWorkoutMinutes / 60)} h total`}
          value={`${recap.workoutCount}`}
        />
        <RecapTile
          label="Avg water"
          note="Per logged day"
          value={
            recap.avgWaterMl === null
              ? "—"
              : `${(recap.avgWaterMl / 1000).toFixed(1)} l`
          }
        />
      </section>

      <section className="mt-8">
        <p className="eyebrow">Where to improve</p>
        <h2 className="mt-2 text-lg font-bold text-white sm:text-xl">
          The next percent.
        </h2>
        <div className="mt-4 grid gap-3">
          {insights.map((insight) => (
            <article
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20"
              key={insight.area}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                {insight.area}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {insight.message}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RecapTile({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-[var(--bg-soft)]/80 p-4 shadow-sm shadow-black/20">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-500">{note}</p>
    </article>
  );
}

type Insight = { area: string; message: string };

function buildInsights(recap: MonthlyRecap): Insight[] {
  const insights: Insight[] = [];
  const calorieTarget = recap.profile?.calorie_target ?? null;
  const proteinTarget = recap.profile?.protein_target_g ?? null;

  // Nutrition
  if (recap.avgCalories === null) {
    insights.push({
      area: "Nutrition",
      message:
        "No meals logged in the last 30 days. Even logging your main meals gives Errday enough to steer your targets.",
    });
  } else if (calorieTarget) {
    const diff = Math.round(recap.avgCalories - calorieTarget);
    if (Math.abs(diff) <= calorieTarget * 0.05) {
      insights.push({
        area: "Nutrition",
        message: `Average intake is within 5% of your ${calorieTarget} kcal target — that consistency is exactly what moves the goal.`,
      });
    } else {
      insights.push({
        area: "Nutrition",
        message: `You averaged ${Math.round(recap.avgCalories)} kcal, ${Math.abs(diff)} kcal ${diff > 0 ? "above" : "below"} target. ${
          diff > 0
            ? "Watch liquid calories and snacks after dinner first — they usually close most of the gap."
            : "If losing weight is going well, fine. If energy is low, add a protein-rich snack around training."
        }`,
      });
    }
    if (
      proteinTarget &&
      recap.avgProteinG !== null &&
      recap.avgProteinG < proteinTarget * 0.9
    ) {
      insights.push({
        area: "Nutrition",
        message: `Protein averaged ${Math.round(recap.avgProteinG)} g of your ${proteinTarget} g target. One extra protein source per meal (quark, eggs, shake) usually fixes this.`,
      });
    }
  }

  // Training
  if (recap.workoutCount === 0) {
    insights.push({
      area: "Training",
      message:
        "No workouts logged this month. Start small: two fixed gym days beat a perfect plan you skip.",
    });
  } else {
    const perWeek = recap.workoutCount / (30 / 7);
    insights.push({
      area: "Training",
      message: `${recap.workoutCount} workouts (~${perWeek.toFixed(1)} per week). ${
        perWeek >= 3
          ? "Solid frequency — now progress the weights and keep rest times honest with the timer."
          : "Aim for one more session per week; consistency beats intensity."
      }`,
    });
  }
  if (recap.avgSteps !== null && recap.avgSteps < 8000) {
    insights.push({
      area: "Training",
      message: `Steps averaged ${Math.round(recap.avgSteps).toLocaleString("en-US")} per day. A 20-minute walk after lunch adds roughly 2'500 and helps recovery too.`,
    });
  }

  // Sleep
  if (recap.avgSleepHours === null) {
    insights.push({
      area: "Sleep",
      message:
        "No sleep logged. Connect Apple Health in Settings and it tracks itself every morning.",
    });
  } else if (recap.avgSleepHours < 7) {
    insights.push({
      area: "Sleep",
      message: `You averaged ${recap.avgSleepHours.toFixed(1)} h. Getting to 7+ hours is the single cheapest boost for training, appetite control and mood — try a fixed lights-out time.`,
    });
  } else {
    insights.push({
      area: "Sleep",
      message: `${recap.avgSleepHours.toFixed(1)} h average across ${recap.sleepNights} nights — recovery is on your side. Keep the rhythm.`,
    });
  }

  return insights;
}
