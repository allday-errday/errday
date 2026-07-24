"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { MealSlot } from "@/types/database";
import type { NormalizedFoodProduct } from "@/lib/food-search/types";
import { FoodResultRow } from "./food-result-row";

type AiFood = {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  typicalServingG: number;
};

type AiEstimateSectionProps = {
  allowInput?: boolean;
  query: string;
  selectedSlot: MealSlot | "";
};

export function AiEstimateSection({
  allowInput = false,
  query,
  selectedSlot,
}: AiEstimateSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [foods, setFoods] = useState<AiFood[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [foodDescription, setFoodDescription] = useState(query);

  async function generate(input = foodDescription) {
    if (input.trim().length < 2) {
      setError("Describe the meal first.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/food/ai-estimate", {
        body: JSON.stringify({ query: input }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        foods?: AiFood[];
      };

      if (!response.ok || !data.foods) {
        setError(data.error ?? "The AI could not create an estimate.");
        return;
      }

      setFoods(data.foods);
    } catch {
      setError("The AI could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (foods) {
    return (
      <section className="mt-6">
        <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Quick estimate · double-check the numbers
        </p>
        <div className="space-y-3">
          {foods.map((food, index) => (
            <FoodResultRow
              defaultGrams={Math.round(food.typicalServingG)}
              key={`${food.name}-${index}`}
              product={toProduct(food, index)}
              selectedSlot={selectedSlot}
            />
          ))}
        </div>
      </section>
    );
  }

  if (allowInput) {
    return (
      <section className="mb-5 border-t border-[var(--border)] pt-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-bold text-white">Quick estimate</h2>
        </div>
        <form
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <input
            aria-label="Describe your food"
            className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-white outline-none placeholder:text-zinc-600 focus:border-[var(--accent)]"
            onChange={(event) => setFoodDescription(event.target.value)}
            placeholder="Describe your meal"
            type="text"
            value={foodDescription}
          />
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Estimate
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-amber-300">{error}</p> : null}
      </section>
    );
  }

  return (
    <div className="mt-6">
      <button
        className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-sm font-bold text-zinc-200 shadow-sm shadow-black/10 transition hover:border-[var(--accent)]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={() => void generate(query)}
        type="button"
      >
        {loading ? <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" /> : null}
        {loading ? "Estimating…" : "Estimate nutrition"}
      </button>
      {error ? (
        <p className="mt-2 text-center text-sm text-amber-300">{error}</p>
      ) : null}
    </div>
  );
}

function toProduct(food: AiFood, index: number): NormalizedFoodProduct {
  return {
    brand: null,
    caloriesPer100g: food.caloriesPer100g,
    carbsPer100g: food.carbsPer100g,
    category: null,
    code: `ai-${Date.now()}-${index}`,
    fatPer100g: food.fatPer100g,
    imageUrl: null,
    name: food.name,
    proteinPer100g: food.proteinPer100g,
    servingSize: `${Math.round(food.typicalServingG)} g typical`,
    source: "ai_estimate",
  };
}
