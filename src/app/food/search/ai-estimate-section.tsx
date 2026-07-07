"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
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
  query: string;
  selectedSlot: MealSlot | "";
};

export function AiEstimateSection({ query, selectedSlot }: AiEstimateSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [foods, setFoods] = useState<AiFood[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/food/ai-estimate", {
        body: JSON.stringify({ query }),
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
        <p className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
          AI estimates · double-check the numbers
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

  return (
    <div className="mt-6">
      <button
        className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-sm font-extrabold text-zinc-200 shadow-sm shadow-black/10 transition hover:border-[var(--accent)]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={generate}
        type="button"
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" />
        ) : (
          <Sparkles className="size-4 text-[var(--accent)]" />
        )}
        {loading ? "Estimating…" : "Generate results using AI"}
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
