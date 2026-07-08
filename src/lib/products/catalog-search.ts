import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedFoodProduct } from "@/lib/food-search/types";

type CatalogRow = {
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  kcal_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fat_100g: number | null;
  serving_size_g: number | null;
  confidence_score: number | null;
};

/**
 * Fast fuzzy search over Errday's own imported Swiss supermarket catalog
 * (branded products). Backed by a trigram index, so it stays instant even
 * with thousands of products — no external API call.
 */
export async function searchProductCatalog(
  supabase: SupabaseClient,
  query: string,
  limit = 12,
): Promise<NormalizedFoodProduct[]> {
  const { data, error } = await supabase.rpc("search_products_local", {
    q: query,
    max_results: limit,
  });

  if (error || !data) {
    return [];
  }

  const rows = data as unknown as CatalogRow[];

  return rows
    .filter((row) => row.kcal_100g !== null)
    .map((row) => {
      const brand = row.brand?.trim() || null;
      const name = row.name.trim();
      return {
        brand,
        caloriesPer100g: row.kcal_100g,
        carbsPer100g: row.carbs_100g,
        category: brand ? `${brand} · Swiss supermarket` : "Swiss supermarket",
        code: row.barcode,
        fatPer100g: row.fat_100g,
        imageUrl: row.image_url,
        name:
          brand && !name.toLowerCase().includes(brand.toLowerCase())
            ? `${name} (${brand})`
            : name,
        proteinPer100g: row.protein_100g,
        servingSize: row.serving_size_g ? `${row.serving_size_g} g` : null,
        source: "errday_products",
      } satisfies NormalizedFoodProduct;
    });
}
