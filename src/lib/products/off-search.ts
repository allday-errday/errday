import "server-only";

import type { NormalizedFoodProduct } from "@/lib/food-search/types";

type OffSearchHit = {
  code?: string;
  product_name?: string;
  brands?: string[] | string;
  image_front_small_url?: string;
  image_front_url?: string;
  serving_quantity?: string | number;
  nutriments?: Record<string, unknown>;
};

function offNumber(nutriments: Record<string, unknown>, key: string) {
  const value = nutriments[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function firstBrand(brands: OffSearchHit["brands"]) {
  if (Array.isArray(brands)) {
    return brands[0]?.trim() || null;
  }
  return brands?.split(",")[0]?.trim() || null;
}

/**
 * Name search against Open Food Facts (Search-a-licious API), limited to
 * products sold in Switzerland and sorted by scan popularity. This is
 * where branded supermarket products come from when the Swiss nutrition
 * database has no match.
 */
export async function searchOpenFoodFacts(
  query: string,
): Promise<NormalizedFoodProduct[]> {
  const params = new URLSearchParams({
    q: `${query} countries_tags:"en:switzerland"`,
    langs: "de",
    page_size: "12",
    fields:
      "code,product_name,brands,image_front_small_url,image_front_url,serving_quantity,nutriments",
  });

  try {
    const response = await fetch(
      `https://search.openfoodfacts.org/search?${params.toString()}`,
      {
        headers: { "User-Agent": "Errday/1.0 (https://errday.ch)" },
        signal: AbortSignal.timeout(7_000),
      },
    );

    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as { hits?: OffSearchHit[] };
    const hits = Array.isArray(body.hits) ? body.hits : [];

    return hits
      .filter(
        (hit): hit is OffSearchHit & { code: string } =>
          typeof hit.code === "string" &&
          /^[0-9]{8,14}$/.test(hit.code) &&
          Boolean(hit.product_name?.trim()),
      )
      .map((hit) => {
        const nutriments = hit.nutriments ?? {};
        const name = (hit.product_name ?? "").trim();
        const brand = firstBrand(hit.brands);
        const servingRaw = Number(hit.serving_quantity);

        return {
          brand,
          caloriesPer100g: offNumber(nutriments, "energy-kcal_100g"),
          carbsPer100g: offNumber(nutriments, "carbohydrates_100g"),
          category: brand ? `${brand} · Open Food Facts` : "Open Food Facts",
          code: hit.code,
          fatPer100g: offNumber(nutriments, "fat_100g"),
          imageUrl: hit.image_front_small_url ?? hit.image_front_url ?? null,
          name:
            brand && !name.toLowerCase().includes(brand.toLowerCase())
              ? `${name} (${brand})`
              : name,
          proteinPer100g: offNumber(nutriments, "proteins_100g"),
          servingSize:
            Number.isFinite(servingRaw) && servingRaw > 0
              ? `${servingRaw} g`
              : null,
          source: "open_food_facts",
        } satisfies NormalizedFoodProduct;
      })
      .filter((product) => product.caloriesPer100g !== null);
  } catch {
    return [];
  }
}
