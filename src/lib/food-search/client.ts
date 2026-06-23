import "server-only";

import swissFoods from "@/data/swiss-foods.json";
import type { FoodSearchResult, NormalizedFoodProduct } from "./types";

type SwissFood = (typeof swissFoods)[number];

type IndexedSwissFood = {
  aliases: string;
  category: string;
  food: SwissFood;
  name: string;
  searchable: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const indexedFoods: IndexedSwissFood[] = swissFoods.map((food) => {
  const name = normalizeSearchText(food.name);
  const aliases = normalizeSearchText(food.aliases ?? "");
  const category = normalizeSearchText(food.category ?? "");

  return {
    aliases,
    category,
    food,
    name,
    searchable: `${name} ${aliases} ${category}`.trim(),
  };
});

function scoreFood(item: IndexedSwissFood, query: string, tokens: string[]) {
  if (item.name === query) return 0;
  if (item.name.startsWith(query)) return 1;
  if (item.aliases.startsWith(query)) return 2;
  if (item.name.includes(query)) return 3;
  if (item.aliases.includes(query)) return 4;
  if (tokens.every((token) => item.searchable.includes(token))) return 5;
  return null;
}

function toProduct(food: SwissFood): NormalizedFoodProduct {
  return {
    brand: null,
    caloriesPer100g: food.calories,
    carbsPer100g: food.carbs,
    category: food.category,
    code: food.id,
    fatPer100g: food.fat,
    imageUrl: null,
    name: food.name,
    proteinPer100g: food.protein,
    servingSize: "100 g",
    source: "swiss_nutrition",
  };
}

export async function searchProducts(query: string): Promise<FoodSearchResult> {
  const clean = normalizeSearchText(query);
  if (!clean) {
    return { error: null, products: [] };
  }

  const tokens = clean.split(" ").filter(Boolean);
  const products = indexedFoods
    .map((item) => ({ item, score: scoreFood(item, clean, tokens) }))
    .filter(
      (
        result,
      ): result is { item: IndexedSwissFood; score: number } =>
        result.score !== null,
    )
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.item.food.name.length - b.item.food.name.length ||
        a.item.food.name.localeCompare(b.item.food.name, "de-CH"),
    )
    .slice(0, 30)
    .map(({ item }) => toProduct(item.food));

  return { error: null, products };
}
