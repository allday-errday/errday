import Link from "next/link";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import {
  calculateFoodLogTotals,
  listFoodItems,
  listFoodLogsForDay,
} from "@/lib/db/food";
import { safeRead } from "@/lib/db/safe-read";
import { FoodForm } from "./food-form";
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

      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Add food</h2>
            <p className="mt-1 text-sm text-zinc-500">Search or scan a product</p>
          </div>
          <Link
            className="flex min-h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-extrabold text-[var(--on-accent)]"
            href="/food/search"
          >
            <Plus className="size-4" />
            Add
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <BarcodeScanButton />
          <Link
            className="flex min-h-10 items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
            href="/food/search?ai=1"
          >
            <Sparkles className="size-4 text-[var(--accent)]" />
            Estimate with AI
          </Link>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-bold text-white">Today&apos;s totals</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="Calories" value={`${totals.calories} kcal`} />
          <Metric label="Protein" value={`${Math.round(totals.proteinG)} g`} />
          <Metric label="Carbs" value={`${Math.round(totals.carbsG)} g`} />
          <Metric label="Fat" value={`${Math.round(totals.fatG)} g`} />
        </div>
      </section>

      <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <span>
            <span className="block font-bold text-white">Saved foods</span>
          </span>
          <ChevronDown className="size-5 text-[var(--accent)]" />
        </summary>
        <div className="border-t border-[var(--border)] p-4">
          {items.length === 0 ? (
            <p className="text-sm leading-6 text-zinc-400">No saved foods yet.</p>
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
