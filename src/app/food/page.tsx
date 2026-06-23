import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import {
  calculateFoodLogTotals,
  listFoodItems,
  listFoodLogsForDay,
} from "@/lib/db/food";
import { safeRead } from "@/lib/db/safe-read";
import { FoodForm } from "./food-form";
import { removeFoodLog } from "./actions";

export default async function FoodPage() {
  const { supabase, user } = await requireUser();
  const today = todayDateString();
  const [items, logs] = await Promise.all([
    safeRead(listFoodItems(supabase, user.id), [], "food items"),
    safeRead(
      listFoodLogsForDay(supabase, user.id, today),
      [],
      "today food logs",
    ),
  ]);
  const totals = calculateFoodLogTotals(logs);

  return (
    <div>
      <PageHeader subtitle="Track calories, macros and meals." title="Food" />

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white">Search products</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Search 1&apos;220 foods from the official Swiss database.
            </p>
          </div>
          <Link
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-black transition hover:bg-[var(--accent-strong)]"
            href="/food/search"
          >
            Search
          </Link>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-white/10 bg-[var(--surface)] p-5 shadow-lg shadow-black/20">
        <h2 className="mb-4 text-lg font-semibold text-white">Log Meal</h2>
        {items.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">
            No food items found. Run migration 0004 in Supabase to seed foods.
          </p>
        ) : (
          <FoodForm items={items} />
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-5 shadow-lg shadow-[var(--accent)]/10">
        <h2 className="text-lg font-semibold text-white">Today&apos;s Totals</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="Calories" value={`${totals.calories} kcal`} />
          <Metric label="Protein" value={`${Math.round(totals.proteinG)} g`} />
          <Metric label="Carbs" value={`${Math.round(totals.carbsG)} g`} />
          <Metric label="Fat" value={`${Math.round(totals.fatG)} g`} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 shadow-lg shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Today&apos;s Entries</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No meals logged today. Add your first item above.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {logs.map((log) => (
              <article
                className="rounded-2xl border border-white/10 bg-[var(--surface-2)] p-4"
                key={log.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {log.food_items?.name ?? "Food"}
                    </p>
                    <p className="mt-1 text-xs uppercase text-zinc-500">
                      {Number(log.servings)} servings
                    </p>
                  </div>
                  <p className="font-bold text-[var(--accent)]">{log.calories} kcal</p>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  P {Number(log.protein_g)}g / C {Number(log.carbs_g)}g / F{" "}
                  {Number(log.fat_g)}g
                </p>
                <form action={removeFoodLog} className="mt-3">
                  <input name="id" type="hidden" value={log.id} />
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
