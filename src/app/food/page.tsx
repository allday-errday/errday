import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
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
import { MacroLogForm } from "./macro-log-form";
import { removeFoodLog } from "./actions";
import { BarcodeScanButton } from "./search/barcode-scan-card";

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
      <PageHeader title="Food" />

      <section className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm shadow-black/20">
        <h2 className="px-1 font-bold text-white">Products</h2>
        <div className="flex items-center gap-2">
          <BarcodeScanButton />
          <Link
            aria-label="Search products"
            className="grid size-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-zinc-300 transition hover:border-[var(--accent)]/50 hover:text-white"
            href="/food/search"
            title="Search products"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </section>

      <details className="group mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <span>
            <span className="block font-bold text-white">Quick Macros</span>
            <span className="mt-1 block text-xs text-zinc-400">
              Log calories & macros directly
            </span>
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] transition group-open:rotate-180">
            <ChevronDown className="size-5" />
          </span>
        </summary>
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-1">
          <MacroLogForm />
        </div>
      </details>

      <section className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
        <h2 className="font-bold text-white">Today&apos;s totals</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="Calories" value={`${totals.calories} kcal`} />
          <Metric label="Protein" value={`${Math.round(totals.proteinG)} g`} />
          <Metric label="Carbs" value={`${Math.round(totals.carbsG)} g`} />
          <Metric label="Fat" value={`${Math.round(totals.fatG)} g`} />
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
        <h2 className="font-bold text-white">Today&apos;s entries</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No meals logged today. Search a product or add quick macros above.
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
                      {log.display_name ?? log.food_items?.name ?? "Food"}
                    </p>
                    <p className="mt-1 text-xs uppercase text-zinc-500">
                      {log.source === "manual_macro"
                        ? "Macro entry"
                        : `${Number(log.servings)} servings`}
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

      <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <span>
            <span className="block font-bold text-white">Saved foods</span>
            <span className="mt-1 block text-xs text-zinc-500">Log from your database</span>
          </span>
          <ChevronDown className="size-5 text-[var(--accent)]" />
        </summary>
        <div className="border-t border-[var(--border)] p-4">
          {items.length === 0 ? (
            <p className="text-sm leading-6 text-zinc-400">
              No food items found. Run migration 0004 in Supabase to seed foods.
            </p>
          ) : (
            <FoodForm items={items} />
          )}
        </div>
      </details>
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
