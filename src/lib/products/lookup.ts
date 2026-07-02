import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateNutrition, type NutritionInput } from "./validate";

export type CanonicalProduct = {
  barcode: string;
  brand: string | null;
  category: string | null;
  confidenceScore: number;
  imageUrl: string | null;
  issues: string[];
  name: string;
  nutrition: NutritionInput;
  primarySource: string;
  productId: string;
  status: "verified" | "unverified" | "pending";
};

export type BarcodeLookupResult =
  | { status: "found"; product: CanonicalProduct }
  | { status: "not_found" }
  | { status: "invalid_barcode" }
  | { status: "error"; message: string };

export function normalizeBarcode(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return /^[0-9]{8,14}$/.test(digits) ? digits : null;
}

/**
 * Scan workflow from the product-database spec:
 * 1. own database first — a verified product is used exclusively
 * 2. otherwise fetch Open Food Facts, keep the raw payload in
 *    product_sources, and store a cleaned canonical record with a
 *    confidence score. The app never renders raw source data.
 */
export async function lookupBarcode(
  supabase: SupabaseClient,
  barcodeInput: string,
): Promise<BarcodeLookupResult> {
  const barcode = normalizeBarcode(barcodeInput);
  if (!barcode) {
    return { status: "invalid_barcode" };
  }

  const existing = await findOwnProduct(supabase, barcode);
  if (existing) {
    return { status: "found", product: existing };
  }

  const off = await fetchOpenFoodFacts(barcode);
  if (off.status === "error") {
    return { status: "error", message: off.message };
  }
  if (off.status === "not_found") {
    return { status: "not_found" };
  }

  const product = await storeCanonicalProduct(supabase, barcode, off.payload);
  if (!product) {
    return { status: "error", message: "Could not store the product." };
  }

  return { status: "found", product };
}

async function findOwnProduct(
  supabase: SupabaseClient,
  barcode: string,
): Promise<CanonicalProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_nutrition(*)")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const nutrition = Array.isArray(data.product_nutrition)
    ? data.product_nutrition[0]
    : data.product_nutrition;

  return {
    barcode: data.barcode,
    brand: data.brand,
    category: data.category,
    confidenceScore: nutrition?.confidence_score ?? 0,
    imageUrl: data.image_url,
    issues: [],
    name: data.name,
    nutrition: {
      kcal100g: nutrition?.kcal_100g ?? null,
      protein100g: nutrition?.protein_100g ?? null,
      carbs100g: nutrition?.carbs_100g ?? null,
      fat100g: nutrition?.fat_100g ?? null,
      saturatedFat100g: nutrition?.saturated_fat_100g ?? null,
      sugar100g: nutrition?.sugar_100g ?? null,
      fiber100g: nutrition?.fiber_100g ?? null,
      salt100g: nutrition?.salt_100g ?? null,
      sodium100g: nutrition?.sodium_100g ?? null,
      servingSizeG: nutrition?.serving_size_g ?? null,
    },
    primarySource: data.primary_source,
    productId: data.id,
    status: data.status,
  };
}

type OffFetchResult =
  | { status: "ok"; payload: Record<string, unknown> }
  | { status: "not_found" }
  | { status: "error"; message: string };

async function fetchOpenFoodFacts(barcode: string): Promise<OffFetchResult> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: { "User-Agent": "Errday/1.0 (https://errday.ch)" },
        signal: AbortSignal.timeout(6_000),
      },
    );

    if (response.status === 404) {
      return { status: "not_found" };
    }
    if (!response.ok) {
      return { status: "error", message: "Product lookup is unavailable right now." };
    }

    const body = (await response.json()) as {
      product?: Record<string, unknown>;
      status?: number;
    };
    if (!body.product || body.status === 0) {
      return { status: "not_found" };
    }

    return { status: "ok", payload: body.product };
  } catch {
    return { status: "error", message: "Product lookup timed out. Try again." };
  }
}

function offNumber(nutriments: Record<string, unknown>, key: string) {
  const value = nutriments[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function offString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function storeCanonicalProduct(
  supabase: SupabaseClient,
  barcode: string,
  payload: Record<string, unknown>,
): Promise<CanonicalProduct | null> {
  const nutriments = (payload.nutriments ?? {}) as Record<string, unknown>;

  const servingRaw = offString(payload, "serving_quantity");
  const servingParsed = servingRaw ? Number.parseFloat(servingRaw) : NaN;
  const nutrition: NutritionInput = {
    kcal100g: offNumber(nutriments, "energy-kcal_100g"),
    protein100g: offNumber(nutriments, "proteins_100g"),
    carbs100g: offNumber(nutriments, "carbohydrates_100g"),
    fat100g: offNumber(nutriments, "fat_100g"),
    saturatedFat100g: offNumber(nutriments, "saturated-fat_100g"),
    sugar100g: offNumber(nutriments, "sugars_100g"),
    fiber100g: offNumber(nutriments, "fiber_100g"),
    salt100g: offNumber(nutriments, "salt_100g"),
    sodium100g: offNumber(nutriments, "sodium_100g"),
    servingSizeG:
      Number.isFinite(servingParsed) && servingParsed > 0 ? servingParsed : null,
  };

  const validation = validateNutrition(nutrition);
  const name =
    offString(payload, "product_name_de") ??
    offString(payload, "product_name") ??
    `Product ${barcode}`;

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert(
      {
        barcode,
        name,
        brand: offString(payload, "brands"),
        category: offString(payload, "categories")?.split(",")[0]?.trim() ?? null,
        image_url: offString(payload, "image_front_url") ?? offString(payload, "image_url"),
        country: "CH",
        status: validation.plausible ? "unverified" : "pending",
        primary_source: "open_food_facts",
      },
      { onConflict: "barcode" },
    )
    .select("id, status")
    .single();

  if (productError || !product) {
    return null;
  }

  const [{ error: nutritionError }] = await Promise.all([
    supabase.from("product_nutrition").upsert({
      product_id: product.id,
      kcal_100g: nutrition.kcal100g,
      protein_100g: nutrition.protein100g,
      carbs_100g: nutrition.carbs100g,
      fat_100g: nutrition.fat100g,
      saturated_fat_100g: nutrition.saturatedFat100g,
      sugar_100g: nutrition.sugar100g,
      fiber_100g: nutrition.fiber100g,
      salt_100g: nutrition.salt100g,
      sodium_100g: nutrition.sodium100g,
      serving_size_g: nutrition.servingSizeG,
      confidence_score: validation.confidenceScore,
    }),
    supabase.from("product_sources").insert({
      product_id: product.id,
      source: "open_food_facts",
      external_id: barcode,
      raw_payload: payload,
      license: "ODbL",
    }),
  ]);

  if (nutritionError) {
    return null;
  }

  return {
    barcode,
    brand: offString(payload, "brands"),
    category: offString(payload, "categories")?.split(",")[0]?.trim() ?? null,
    confidenceScore: validation.confidenceScore,
    imageUrl: offString(payload, "image_front_url") ?? offString(payload, "image_url"),
    issues: validation.issues,
    name,
    nutrition,
    primarySource: "open_food_facts",
    productId: product.id,
    status: validation.plausible ? "unverified" : "pending",
  };
}
