import type { FoodSearchResult, NormalizedFoodProduct } from "./types";

const baseUrl = "https://api.nal.usda.gov/fdc/v1";

function apiKey() {
  return process.env.FDC_API_KEY;
}

type FdcNutrient = {
  nutrientNumber?: unknown;
  number?: unknown;
  value?: unknown;
  unitName?: unknown;
};

type FdcFood = {
  fdcId?: unknown;
  description?: unknown;
  brandName?: unknown;
  brandOwner?: unknown;
  gtinUpc?: unknown;
  servingSize?: unknown;
  servingSizeUnit?: unknown;
  householdServingFullText?: unknown;
  foodNutrients?: FdcNutrient[];
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

function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

// FoodData Central reports foodNutrients per 100 g for all data types.
function byNumber(food: FdcFood, ...numbers: string[]): number | null {
  const list = food.foodNutrients ?? [];
  for (const target of numbers) {
    const hit = list.find(
      (n) => String(n.nutrientNumber ?? n.number ?? "") === target,
    );
    if (hit) {
      return num(hit.value);
    }
  }
  return null;
}

function normalize(food: FdcFood): NormalizedFoodProduct | null {
  const name = str(food.description);
  const fdcId = num(food.fdcId);
  if (!name || fdcId === null) {
    return null;
  }

  const servingSize = num(food.servingSize);
  const servingUnit = str(food.servingSizeUnit);
  const household = str(food.householdServingFullText);

  return {
    brand: str(food.brandName) ?? str(food.brandOwner),
    caloriesPer100g: round1(byNumber(food, "208", "957", "958")),
    carbsPer100g: round1(byNumber(food, "205")),
    code: String(fdcId),
    fatPer100g: round1(byNumber(food, "204")),
    imageUrl: null,
    name,
    proteinPer100g: round1(byNumber(food, "203")),
    servingSize:
      household ??
      (servingSize !== null
        ? `${servingSize} ${servingUnit ?? "g"}`
        : null),
    source: "usda",
  };
}

async function fdc<T>(
  path: string,
): Promise<{ data: T | null; error: FoodSearchResult["error"] }> {
  const key = apiKey();
  if (!key) {
    return {
      data: null,
      error: "Food search is not configured yet. Add FDC_API_KEY.",
    };
  }

  const separator = path.includes("?") ? "&" : "?";
  try {
    const response = await fetch(
      `${baseUrl}${path}${separator}api_key=${encodeURIComponent(key)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 60 * 60 } },
    );

    if (!response.ok) {
      console.error(`[FDC] ${response.status} ${response.statusText}`);
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
    console.error("[FDC] request failed", error);
    return { data: null, error: "Food search is unavailable right now." };
  }
}

export async function searchProducts(query: string): Promise<FoodSearchResult> {
  const clean = query.trim();
  if (!clean) {
    return { error: null, products: [] };
  }

  const { data, error } = await fdc<{ foods?: FdcFood[] }>(
    `/foods/search?query=${encodeURIComponent(clean)}&pageSize=25&dataType=${encodeURIComponent(
      "Foundation,SR Legacy,Branded",
    )}`,
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

  const { data } = await fdc<{ foods?: FdcFood[] }>(
    `/foods/search?query=${encodeURIComponent(upc)}&pageSize=10&dataType=Branded`,
  );

  const foods = data?.foods ?? [];
  const exact = foods.find((f) => String(f.gtinUpc ?? "").replace(/\D/g, "") === upc);
  const food = exact ?? foods[0];
  return food ? normalize(food) : null;
}
