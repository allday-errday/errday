"use client";

import { Flame, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { MealSlot } from "@/types/database";
import type { NormalizedFoodProduct } from "@/lib/food-search/types";
import { logFoodProduct } from "./actions";

const sourceLabels: Record<string, string> = {
  ai_estimate: "Quick estimate",
  errday_products: "Errday product",
  open_food_facts: "Open Food Facts",
  swiss_nutrition: "Swiss database",
  usda_fdc: "USDA database",
};

const gramPresets = [30, 50, 100, 150, 200];

function formatMacro(value: number | null, unit = "") {
  if (value === null) {
    return "–";
  }
  return `${Math.round(value * 10) / 10}${unit}`;
}

function parseServingGrams(servingSize: string | null): number | null {
  if (!servingSize) return null;
  const match = servingSize.match(/([\d.]+)/);
  const grams = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(grams) && grams > 0 && grams <= 2000 ? grams : null;
}

type Unit = "serving" | "grams";

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
  const servingGrams = parseServingGrams(product.servingSize);
  const [unit, setUnit] = useState<Unit>(servingGrams ? "serving" : "grams");
  const [quantity, setQuantity] = useState(servingGrams ? 1 : defaultGrams);

  const canLog = product.caloriesPer100g !== null;
  const grams =
    unit === "serving" && servingGrams
      ? Math.round(quantity * servingGrams)
      : Math.round(quantity);
  const kcalForGrams =
    product.caloriesPer100g === null
      ? null
      : Math.round((product.caloriesPer100g * grams) / 100);

  const step = unit === "serving" ? 0.5 : 10;
  const nudge = (delta: number) =>
    setQuantity((value) => {
      const next = Math.round((value + delta) * 100) / 100;
      return next < (unit === "serving" ? 0.5 : 1)
        ? unit === "serving"
          ? 0.5
          : 1
        : next;
    });

  function switchUnit(next: Unit) {
    if (next === unit) return;
    setUnit(next);
    setQuantity(next === "serving" ? 1 : 100);
  }

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] transition">
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
              : "bg-[var(--accent)] text-[var(--on-accent)]"
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
          {/* Meal slot is inferred from time of day — no picker needed. */}
          <input name="meal_slot" type="hidden" value={selectedSlot} />
          {/* The action logs by grams; we compute it from the chosen unit. */}
          <input name="grams" type="hidden" value={grams} />

          <p className="text-xs font-semibold text-zinc-500">
            P {formatMacro(product.proteinPer100g, "g")} · C{" "}
            {formatMacro(product.carbsPer100g, "g")} · F{" "}
            {formatMacro(product.fatPer100g, "g")} per 100 g
          </p>

          {servingGrams ? (
            <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1 text-sm font-bold">
              <button
                className={`min-h-9 flex-1 rounded-full px-3 transition ${
                  unit === "serving"
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "text-zinc-400"
                }`}
                onClick={() => switchUnit("serving")}
                type="button"
              >
                Serving ({servingGrams} g)
              </button>
              <button
                className={`min-h-9 flex-1 rounded-full px-3 transition ${
                  unit === "grams"
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "text-zinc-400"
                }`}
                onClick={() => switchUnit("grams")}
                type="button"
              >
                Grams
              </button>
            </div>
          ) : null}

          <div className="flex items-stretch gap-2">
            <button
              aria-label="Less"
              className="grid w-12 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-zinc-300 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
              onClick={() => nudge(-step)}
              type="button"
            >
              <Minus className="size-4" />
            </button>
            <label className="grid flex-1 gap-1 text-center">
              <input
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-center text-lg font-bold text-white outline-none focus:border-[var(--accent)]"
                inputMode="decimal"
                min={unit === "serving" ? "0.5" : "1"}
                onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                step={step}
                type="number"
                value={quantity || ""}
              />
              <span className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">
                {unit === "serving"
                  ? `serving${quantity === 1 ? "" : "s"} · ${grams} g`
                  : "grams"}
              </span>
            </label>
            <button
              aria-label="More"
              className="grid w-12 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-zinc-300 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
              onClick={() => nudge(step)}
              type="button"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {unit === "grams" ? (
            <div className="flex flex-wrap gap-2">
              {gramPresets.map((preset) => (
                <button
                  className={`min-h-9 rounded-full border px-3 text-sm font-bold transition ${
                    quantity === preset
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-zinc-400 hover:text-zinc-200"
                  }`}
                  key={preset}
                  onClick={() => setQuantity(preset)}
                  type="button"
                >
                  {preset} g
                </button>
              ))}
            </div>
          ) : null}

          <SubmitButton pendingLabel="Logging…">
            Log{kcalForGrams !== null ? ` · ${kcalForGrams} kcal` : ""}
          </SubmitButton>
        </form>
      ) : null}
    </article>
  );
}
