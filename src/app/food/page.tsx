import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Sparkles,
  Utensils,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import {
  calculateFoodLogTotals,
  listFoodItems,
  listFoodLogsForDay,
} from "@/lib/db/food";
import { safeRead } from "@/lib/db/safe-read";
import type { FoodLogWithItem } from "@/types/database";
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
        <Link
          className="apple-row flex items-center gap-3 px-4 transition hover:bg-[var(--surface-2)]"
          href="/food/search?ai=1"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base text-white">Ask Errday AI</span>
            <span className="block truncate text-sm text-zinc-500">
              Estimate a meal in plain words
            </span>
          </span>
          <ChevronRight className="size-5 text-zinc-500" />
        </Link>
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

      <TodayFoodLogList logs={logs} />

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

function TodayFoodLogList({ logs }: { logs: FoodLogWithItem[] }) {
  const mealCount = logs.length;

  return (
    <details className="apple-group mb-6 group">
      <summary className="apple-row flex cursor-pointer list-none items-center gap-3 px-4">
        <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <Utensils aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">Today&apos;s food</span>
          <span className="block text-sm text-zinc-500">
            {mealCount === 0
              ? "No meals logged"
              : `${mealCount} ${mealCount === 1 ? "meal" : "meals"} · ${Math.round(
                  logs.reduce((total, log) => total + log.calories, 0),
                )} kcal`}
          </span>
        </span>
        <ChevronDown className="size-5 text-zinc-500 transition group-open:rotate-180" />
      </summary>
      {mealCount === 0 ? (
        <div className="border-t border-[var(--border)] px-4 py-5">
          <p className="text-sm text-zinc-500">Your meals will appear here.</p>
        </div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {logs.map((log) => (
            <article
              className="apple-row flex items-center gap-3 px-4"
              key={log.id}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">
                  {log.display_name ?? log.food_items?.name ?? "Meal"}
                </span>
                <span className="block text-sm text-zinc-500">
                  {formatLoggedTime(log.logged_at)}
                </span>
              </span>
              <span className="text-sm font-semibold text-white">
                {Math.round(log.calories)} kcal
              </span>
            </article>
          ))}
        </div>
      )}
    </details>
  );
}

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
});

function formatLoggedTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
