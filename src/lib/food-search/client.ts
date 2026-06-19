import type { FoodSearchResult, NormalizedFoodProduct } from "./types";

const baseUrl = "https://trackapi.nutritionix.com/v2";

function credentials() {
  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_APP_KEY;
  return { appId, appKey, configured: Boolean(appId && appKey) };
}

type NutritionixFood = {
  food_name?: unknown;
  brand_name?: unknown;
  nix_item_id?: unknown;
  serving_qty?: unknown;
  serving_unit?: unknown;
  serving_weight_grams?: unknown;
  nf_calories?: unknown;
  nf_protein?: unknown;
  nf_total_carbohydrate?: unknown;
  nf_total_fat?: unknown;
  photo?: { thumb?: unknown } | null;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function per100(value: unknown, grams: number | null): number | null {
  const v = num(value);
  if (v === null || grams === null || grams <= 0) {
    return null;
  }
  return Math.round((v / grams) * 100 * 10) / 10;
}

function normalize(food: NutritionixFood): NormalizedFoodProduct | null {
  const name = str(food.food_name);
  if (!name) {
    return null;
  }
  const grams = num(food.serving_weight_grams);
  const brand = str(food.brand_name);
  const itemId = str(food.nix_item_id);
  const servingQty = num(food.serving_qty);
  const servingUnit = str(food.serving_unit);

  return {
    brand,
    caloriesPer100g: per100(food.nf_calories, grams),
    carbsPer100g: per100(food.nf_total_carbohydrate, grams),
    code: itemId ?? `nlp:${slug(name)}`,
    fatPer100g: per100(food.nf_total_fat, grams),
    imageUrl: str(food.photo?.thumb),
    name,
    proteinPer100g: per100(food.nf_protein, grams),
    servingSize:
      servingQty !== null && servingUnit
        ? `${servingQty} ${servingUnit}${grams ? ` (${Math.round(grams)} g)` : ""}`
        : grams
          ? `${Math.round(grams)} g`
          : null,
    source: "nutritionix",
  };
}

async function nutritionix<T>(
  path: string,
  init: RequestInit,
): Promise<{ data: T | null; error: FoodSearchResult["error"] }> {
  const { appId, appKey, configured } = credentials();
  if (!configured) {
    return {
      data: null,
      error:
        "Food search is not configured yet. Add NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY.",
    };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-app-id": appId as string,
        "x-app-key": appKey as string,
        ...(init.headers ?? {}),
      },
      next: { revalidate: 60 * 60 },
    });

    if (response.status === 404) {
      return { data: null, error: null };
    }

    if (!response.ok) {
      console.error(`[Nutritionix] ${response.status} ${response.statusText}`);
      return {
        data: null,
        error:
          response.status === 429
            ? "Food search is rate limited right now. Try again shortly."
            : "Food search is unavailable right now. Try again shortly.",
      };
    }

    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    console.error("[Nutritionix] request failed", error);
    return { data: null, error: "Food search is unavailable right now." };
  }
}

export async function searchProducts(query: string): Promise<FoodSearchResult> {
  const clean = query.trim();
  if (!clean) {
    return { error: null, products: [] };
  }

  const { data, error } = await nutritionix<{ foods?: NutritionixFood[] }>(
    "/natural/nutrients",
    { method: "POST", body: JSON.stringify({ query: clean }) },
  );

  if (error) {
    return { error, products: [] };
  }

  return {
    error: null,
    products: (data?.foods ?? [])
      .map(normalize)
      .filter((p): p is NormalizedFoodProduct => p !== null),
  };
}

export async function getProductByBarcode(
  barcode: string,
): Promise<NormalizedFoodProduct | null> {
  const upc = barcode.replace(/\D/g, "");
  if (!upc) {
    return null;
  }

  const { data } = await nutritionix<{ foods?: NutritionixFood[] }>(
    `/search/item?upc=${encodeURIComponent(upc)}`,
    { method: "GET" },
  );

  const food = data?.foods?.[0];
  return food ? normalize(food) : null;
}
