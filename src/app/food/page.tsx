import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { formatDate, todayDateString } from "@/lib/dates";
import { calculateFoodTotals, listFoodEntries } from "@/lib/db/food";
import { FoodForm } from "./food-form";
import { removeFoodEntry } from "./actions";

export default async function FoodPage() {
  const { supabase, user } = await requireUser();
  const today = todayDateString();
  const entries = await listFoodEntries(supabase, user.id, today);
  const totals = calculateFoodTotals(entries);

  return (
    <div>
      <PageHeader
        subtitle="Track calories, macros and meals."
        title="Food"
      />

      <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Log Meal</h2>
        <FoodForm />
      </section>

      <section className="mb-5 rounded-lg border border-[#22c55e]/30 bg-[#121712] p-5">
        <h2 className="text-lg font-semibold text-white">Today&apos;s Totals</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="Calories" value={`${totals.calories} kcal`} />
          <Metric label="Protein" value={`${Math.round(totals.proteinG)} g`} />
          <Metric label="Carbs" value={`${Math.round(totals.carbsG)} g`} />
          <Metric label="Fat" value={`${Math.round(totals.fatG)} g`} />
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="text-lg font-semibold text-white">Today&apos;s Entries</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No meals logged today. Add your first manual entry above.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <article
                className="rounded-lg border border-white/10 bg-black/20 p-4"
                key={entry.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{entry.name}</p>
                    <p className="mt-1 text-xs uppercase text-zinc-500">
                      {entry.meal_type} · {formatDate(entry.date)}
                    </p>
                  </div>
                  <p className="font-bold text-[#22c55e]">
                    {entry.calories} kcal
                  </p>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  P {Number(entry.protein_g)}g · C {Number(entry.carbs_g)}g · F{" "}
                  {Number(entry.fat_g)}g
                </p>
                {entry.amount ? (
                  <p className="mt-1 text-sm text-zinc-500">{entry.amount}</p>
                ) : null}
                <form action={removeFoodEntry} className="mt-3">
                  <input name="id" type="hidden" value={entry.id} />
                  <SubmitButton pendingLabel="Deleting..." variant="danger">
                    Delete
                  </SubmitButton>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
