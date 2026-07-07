"use client";

import { Flame, Plus, X } from "lucide-react";
import { useState } from "react";
import type { MealSlot } from "@/types/database";
import type { NormalizedFoodProduct } from "@/lib/food-search/types";
import { logFoodProduct } from "./actions";

const mealSlots: { label: string; value: MealSlot }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
  { label: "Pre-workout", value: "pre_workout" },
  { label: "Post-workout", value: "post_workout" },
];

const sourceLabels: Record<string, string> = {
  ai_estimate: "AI estimate",
  errday_products: "Errday product",
  open_food_facts: "Open Food Facts",
  swiss_nutrition: "Swiss database",
  usda_fdc: "USDA database",
};

function formatMacro(value: number | null, unit = "") {
  if (value === null) {
    return "–";
  }
  return `${Math.round(value * 10) / 10}${unit}`;
}

type FoodResultRowProps = {
  defaultGrams?: number;
  product: NormalizedFoodProduct;
  selectedSlot: MealSlot | "";
};

export function FoodResultRow({
  defaultGrams = 100,
  product,
  selectedSlot,
}: FoodResultRowProps) {
  const [open, setOpen] = useState(false);
  const [grams, setGrams] = useState(defaultGrams);
  const canLog = product.caloriesPer100g !== null;
  const kcalForGrams =
    product.caloriesPer100g === null
      ? null
      : Math.round((product.caloriesPer100g * grams) / 100);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/10 transition">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => canLog && setOpen((value) => !value)}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-white">{product.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <Flame aria-hidden className="size-4 text-[var(--accent)]" />
            <span className="font-semibold text-zinc-300">
              {formatMacro(product.caloriesPer100g)} kcal
            </span>
            <span>· 100 g</span>
            <span className="hidden truncate sm:inline">
              · {product.brand ?? sourceLabels[product.source] ?? product.source}
            </span>
          </p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
            open
              ? "bg-white/[0.08] text-zinc-300"
              : "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25"
          } ${canLog ? "" : "opacity-30"}`}
        >
          {open ? <X className="size-4" /> : <Plus className="size-5" />}
        </span>
      </button>

      {open && canLog ? (
        <form
          action={logFoodProduct}
          className="grid gap-3 border-t border-[var(--border)] p-4"
        >
          <input name="code" type="hidden" value={product.code} />
          <input name="name" type="hidden" value={product.name} />
          <input name="brand" type="hidden" value={product.brand ?? ""} />
          <input name="source" type="hidden" value={product.source} />
          <input name="image_url" type="hidden" value="" />
          <input name="serving_size" type="hidden" value={product.servingSize ?? ""} />
          <input name="cal100" type="hidden" value={product.caloriesPer100g ?? ""} />
          <input name="protein100" type="hidden" value={product.proteinPer100g ?? ""} />
          <input name="carbs100" type="hidden" value={product.carbsPer100g ?? ""} />
          <input name="fat100" type="hidden" value={product.fatPer100g ?? ""} />

          <p className="text-xs font-semibold text-zinc-500">
            P {formatMacro(product.proteinPer100g, "g")} · C{" "}
            {formatMacro(product.carbsPer100g, "g")} · F{" "}
            {formatMacro(product.fatPer100g, "g")} per 100 g
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5 text-xs font-bold text-zinc-400">
              Grams
              <input
                className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base font-semibold text-white outline-none focus:border-[var(--accent)]"
                min="1"
                name="grams"
                onChange={(event) => setGrams(Number(event.target.value) || 0)}
                step="1"
                type="number"
                value={grams || ""}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-zinc-400">
              Meal
              <select
                className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base font-semibold text-white outline-none focus:border-[var(--accent)]"
                defaultValue={selectedSlot}
                name="meal_slot"
              >
                <option value="">Auto</option>
                {mealSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            className="min-h-12 rounded-full bg-[var(--accent)] px-4 text-sm font-extrabold text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110"
            type="submit"
          >
            Log{kcalForGrams !== null ? ` · ${kcalForGrams} kcal` : ""}
          </button>
        </form>
      ) : null}
    </article>
  );
}
