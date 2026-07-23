import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { searchProducts } from "@/lib/food-search/client";
import { expandQuery } from "@/lib/food-search/synonyms";
import { searchGenericFoods, type GenericFood } from "@/lib/db/generic-foods";
import { searchProductCatalog } from "@/lib/products/catalog-search";
import { AiEstimateSection } from "./ai-estimate-section";
import { FoodResultRow } from "./food-result-row";
import { BarcodeScanButton } from "./barcode-scan-card";
import type { NormalizedFoodProduct } from "@/lib/food-search/types";
import {
  lookupBarcode,
  normalizeBarcode,
  type BarcodeLookupResult,
  type CanonicalProduct,
} from "@/lib/products/lookup";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { MealSlot } from "@/types/database";

type FoodSearchPageProps = {
  searchParams: Promise<{
    barcode?: string;
    ai?: string;
    error?: string;
    q?: string;
    slot?: string;
  }>;
};

function canonicalToNormalized(product: CanonicalProduct): NormalizedFoodProduct {
  return {
    brand: product.brand,
    caloriesPer100g: product.nutrition.kcal100g,
    carbsPer100g: product.nutrition.carbs100g,
    category: product.category,
    code: product.barcode,
    fatPer100g: product.nutrition.fat100g,
    imageUrl: product.imageUrl,
    name: product.brand ? `${product.name} (${product.brand})` : product.name,
    proteinPer100g: product.nutrition.protein100g,
    servingSize: product.nutrition.servingSizeG
      ? `${product.nutrition.servingSizeG} g`
      : null,
    source: "errday_products",
  };
}

const mealSlots: Array<{ label: string; value: MealSlot }> = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
  { label: "Pre-Workout", value: "pre_workout" },
  { label: "Post-Workout", value: "post_workout" },
];

function isMealSlot(value?: string): value is MealSlot {
  return mealSlots.some((slot) => slot.value === value);
}

// Run a search across the original query and its cross-language variants,
// merging unique products (by code) until the cap is reached.
async function gatherAcrossLanguages(
  queries: string[],
  fetchOne: (q: string) => Promise<NormalizedFoodProduct[]>,
  cap: number,
): Promise<NormalizedFoodProduct[]> {
  const seen = new Set<string>();
  const out: NormalizedFoodProduct[] = [];
  for (const q of queries) {
    let rows: NormalizedFoodProduct[] = [];
    try {
      rows = await fetchOne(q);
    } catch {
      rows = [];
    }
    for (const row of rows) {
      if (seen.has(row.code)) continue;
      seen.add(row.code);
      out.push(row);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

export default async function FoodSearchPage({
  searchParams,
}: FoodSearchPageProps) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? params.barcode?.trim() ?? "";
  const aiMode = params.ai === "1";
  const selectedSlot = isMealSlot(params.slot) ? params.slot : "";

  // One relaxed search box: digits are treated as a barcode, everything
  // else searches the Swiss food database by name — topped up with generic
  // foods from the USDA FoodData Central datasets (SR Legacy + Foundation).
  const barcode = normalizeBarcode(query);
  // The original query plus cross-language variants ("oats" also searches
  // "haferflocken"), so English/French searches find German-named products.
  const queries = query && !barcode ? [query, ...expandQuery(query)] : [query];

  const searchResult =
    query && !barcode
      ? await searchProducts(query)
      : { error: null, products: [] };
  const products =
    query && !barcode
      ? await gatherAcrossLanguages(
          queries,
          (q) => searchProducts(q).then((result) => result.products),
          20,
        )
      : searchResult.products;

  // Errday's own imported Swiss supermarket catalog (branded products) —
  // instant, trigram-indexed, no external call.
  let catalogProducts: NormalizedFoodProduct[] = [];
  if (query && !barcode && query.length >= 2) {
    catalogProducts = await gatherAcrossLanguages(
      queries,
      (q) => searchProductCatalog(supabase, q),
      12,
    );
  }

  let usdaProducts: NormalizedFoodProduct[] = [];
  if (query && !barcode && query.length >= 3) {
    usdaProducts = await gatherAcrossLanguages(
      queries,
      (q) => searchGenericFoods(supabase, q).then((list) => list.map(genericToNormalized)),
      10,
    );
  }

  let barcodeResult: BarcodeLookupResult | null = null;
  if (barcode) {
    const lookupLimit = checkRateLimit(`barcode:${user.id}`, 30, 10 * 60);
    barcodeResult = lookupLimit.allowed
      ? await lookupBarcode(supabase, barcode)
      : { status: "error", message: "Too many lookups. Try again in a few minutes." };
  }

  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
        <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">Food</h1>
        <BarcodeScanButton />
      </header>

      <section className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <form className="grid gap-3">
          {selectedSlot ? (
            <input name="slot" type="hidden" value={selectedSlot} />
          ) : null}
          <label className="grid gap-2 text-sm font-bold text-zinc-300">
            Search food
            <div className="grid gap-2 sm:flex">
              <input
                className="min-h-12 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base text-white outline-none focus:border-[var(--accent)]"
                defaultValue={query}
                name="q"
                placeholder="Apfel, Poulet — or a barcode"
                type="search"
              />
              <button
                className="min-h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-[var(--on-accent)]"
                type="submit"
              >
                Search
              </button>
            </div>
          </label>
        </form>
      </section>

      {barcodeResult ? (
        <BarcodeResult result={barcodeResult} selectedSlot={selectedSlot} />
      ) : null}

      {params.error ? <ErrorMessage error={params.error} /> : null}
      {searchResult.error ? <ErrorMessage message={searchResult.error} /> : null}

      {aiMode ? <AiEstimateSection allowInput query={query} selectedSlot={selectedSlot} /> : null}

      {!query || aiMode ? null : barcode ? null : searchResult.error ? null : products.length === 0 &&
        catalogProducts.length === 0 &&
        usdaProducts.length === 0 ? (
        <>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-bold text-white">No product found</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Try another name or estimate it with AI.
            </p>
          </section>
        </>
      ) : (
        <>
          {products.length > 0 ? (
            <section className="space-y-3">
              {products.map((product) => (
                <FoodResultRow
                  key={product.code}
                  product={product}
                  selectedSlot={selectedSlot}
                />
              ))}
            </section>
          ) : null}
          {catalogProducts.length > 0 ? (
            <section className={products.length > 0 ? "mt-6" : ""}>
              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Swiss supermarket products
              </p>
              <div className="space-y-3">
                {catalogProducts.map((product) => (
                  <FoodResultRow
                    key={product.code}
                    product={product}
                    selectedSlot={selectedSlot}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {usdaProducts.length > 0 ? (
            <section className="mt-6">
              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                More foods · USDA database
              </p>
              <div className="space-y-3">
                {usdaProducts.map((product) => (
                  <FoodResultRow
                    key={product.code}
                    product={product}
                    selectedSlot={selectedSlot}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <AiEstimateSection query={query} selectedSlot={selectedSlot} />
        </>
      )}

      <Link
        className="mt-5 block text-center text-sm font-bold text-zinc-500"
        href="/food"
      >
        Back to Food
      </Link>
    </div>
  );
}

function BarcodeResult({
  result,
  selectedSlot,
}: {
  result: BarcodeLookupResult;
  selectedSlot: MealSlot | "";
}) {
  if (result.status === "found") {
    const confidence = Math.round(result.product.confidenceScore * 100);
    return (
      <section className="mb-5 space-y-2">
        <FoodResultRow
          product={canonicalToNormalized(result.product)}
          selectedSlot={selectedSlot}
        />
        <p className="px-1 text-xs text-zinc-500">
          {result.product.status === "verified"
            ? "Verified Errday product."
            : `Data confidence ${confidence}% · Source: ${
                result.product.primarySource === "open_food_facts"
                  ? "Open Food Facts"
                  : result.product.primarySource
              }`}
          {result.product.issues.length > 0
            ? ` · Flagged: ${result.product.issues.join("; ")}`
            : ""}
        </p>
      </section>
    );
  }

  const messages: Record<string, string> = {
    invalid_barcode: "That doesn't look like a valid barcode (8–14 digits).",
    not_found:
      "No product found for this barcode yet. You can log it manually on the Food page.",
  };

  return (
    <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
      {result.status === "error" ? result.message : messages[result.status]}
    </p>
  );
}

function ErrorMessage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const messages: Record<string, string> = {
    "invalid-log": "Choose a product and enter a valid gram amount.",
    "missing-calories": "This product is missing calories, so it cannot be logged yet.",
    "not-found": "We couldn't find that product.",
  };

  return (
    <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
      {message ?? messages[error ?? ""] ?? "Something went wrong."}
    </p>
  );
}

function genericToNormalized(food: GenericFood): NormalizedFoodProduct {
  return {
    brand: null,
    caloriesPer100g: Number(food.kcal_100g),
    carbsPer100g: Number(food.carbs_100g),
    category: food.category,
    code: `fdc-${food.fdc_id}`,
    fatPer100g: Number(food.fat_100g),
    imageUrl: null,
    name: food.name,
    proteinPer100g: Number(food.protein_100g),
    servingSize: "100 g",
    source: "usda_fdc",
  };
}
