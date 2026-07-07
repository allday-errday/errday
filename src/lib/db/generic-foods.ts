import type { SupabaseClient } from "@supabase/supabase-js";

export type GenericFood = {
  id: string;
  fdc_id: number;
  name: string;
  category: string | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
};

export async function searchGenericFoods(
  supabase: SupabaseClient,
  query: string,
  limit = 15,
) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9äöüéèà%]+/i)
    .filter((token) => token.length > 1)
    .slice(0, 5);

  if (tokens.length === 0) {
    return [];
  }

  let builder = supabase
    .from("generic_foods")
    .select("id, fdc_id, name, category, kcal_100g, protein_100g, carbs_100g, fat_100g");

  for (const token of tokens) {
    builder = builder.ilike("name", `%${token}%`);
  }

  const { data, error } = await builder.limit(60).returns<GenericFood[]>();

  if (error) {
    throw error;
  }

  // Shorter names first — they're usually the base food, not a variant.
  return (data ?? [])
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, limit);
}
