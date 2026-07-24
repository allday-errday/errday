import Link from "next/link";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
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
      <PageHeader
        title="Food"
        trailing={
          <Link
            aria-label="Add food"
            className="grid size-10 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]"
            href="/food/search"
          >
            <Plus className="size-5" />
          </Link>
        }
      />

      <section className="apple-group mb-6">
        <Link className="apple-row flex items-center gap-3 px-4 transition hover:bg-[var(--surface-2)]" href="/food/search">
          <Search className="size-5 text-zinc-500" />
          <span className="flex-1 text-base text-white">Search food</span>
          <ChevronRight className="size-5 text-zinc-500" />
        </Link>
        <div className="apple-row flex items-center">
          <BarcodeScanButton />
        </div>
      </section>

      <p className="apple-section-title">Today</p>
      <section className="apple-group mb-6 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Calories</p>
            <p className="mt-1 text-4xl font-bold text-white">{totals.calories}<span className="ml-1 text-lg font-semibold text-zinc-500">kcal</span></p>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--accent)]"
            href="/food/search"
          >
            Add
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--border)] pt-1">
          <Metric label="Protein" value={`${Math.round(totals.proteinG)} g`} />
          <Metric label="Carbs" value={`${Math.round(totals.carbsG)} g`} />
          <Metric label="Fat" value={`${Math.round(totals.fatG)} g`} />
        </div>
      </section>

      <p className="apple-section-title">Library</p>
      <details className="apple-group group">
        <summary className="apple-row flex cursor-pointer list-none items-center justify-between gap-3 px-4">
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
    <div className="px-3 first:pl-0 last:pr-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
