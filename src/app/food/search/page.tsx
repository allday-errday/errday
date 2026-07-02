import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { searchProducts } from "@/lib/food-search/client";
import type { NormalizedFoodProduct } from "@/lib/food-search/types";
import {
  lookupBarcode,
  normalizeBarcode,
  type BarcodeLookupResult,
  type CanonicalProduct,
} from "@/lib/products/lookup";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { MealSlot } from "@/types/database";
import { logFoodProduct } from "./actions";

type FoodSearchPageProps = {
  searchParams: Promise<{
    barcode?: string;
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

export default async function FoodSearchPage({
  searchParams,
}: FoodSearchPageProps) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? params.barcode?.trim() ?? "";
  const selectedSlot = isMealSlot(params.slot) ? params.slot : "";

  // One relaxed search box: digits are treated as a barcode, everything
  // else searches the Swiss food database by name.
  const barcode = normalizeBarcode(query);
  const searchResult =
    query && !barcode
      ? await searchProducts(query)
      : { error: null, products: [] };
  const products = searchResult.products;

  let barcodeResult: BarcodeLookupResult | null = null;
  if (barcode) {
    const lookupLimit = checkRateLimit(`barcode:${user.id}`, 30, 10 * 60);
    barcodeResult = lookupLimit.allowed
      ? await lookupBarcode(supabase, barcode)
      : { status: "error", message: "Too many lookups. Try again in a few minutes." };
  }

  return (
    <div>
      <PageHeader
        subtitle="Search the official Swiss food database and log exact gram amounts into today."
        title="Log Meal"
      />

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
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
                className="min-h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black"
                type="submit"
              >
                Search
              </button>
            </div>
          </label>
        </form>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          1&apos;220 foods · Version 7.0 · Values per 100 g · Source:{" "}
          <a
            className="font-semibold text-[var(--accent)] hover:underline"
            href="https://naehrwertdaten.ch/de/"
            rel="noreferrer"
            target="_blank"
          >
            Schweizer Nährwertdatenbank (BLV)
          </a>
        </p>
      </section>

      {barcodeResult ? (
        <BarcodeResult result={barcodeResult} selectedSlot={selectedSlot} />
      ) : null}

      {params.error ? <ErrorMessage error={params.error} /> : null}
      {searchResult.error ? <ErrorMessage message={searchResult.error} /> : null}

      {!query ? (
        <EmptyState />
      ) : barcode ? null : searchResult.error ? null : products.length === 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
          <h2 className="font-bold text-white">No product found</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Try another name, a synonym or a broader search term.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {products.map((product) => (
            <ProductCard
              key={product.code}
              product={product}
              selectedSlot={selectedSlot}
            />
          ))}
        </section>
      )}

      <Link
        className="mt-5 block text-center text-sm font-bold text-zinc-500"
        href="/food"
      >
        Back to manual food log
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
        <ProductCard
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

function EmptyState() {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
      <h2 className="font-bold text-white">Search Swiss foods</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Search by food name or synonym. Errday uses grams to calculate calories
        and macros from the official values per 100 g.
      </p>
    </section>
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

function ProductCard({
  product,
  selectedSlot,
}: {
  product: NormalizedFoodProduct;
  selectedSlot: MealSlot | "";
}) {
  const canLog = product.caloriesPer100g !== null;

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
      <div className="flex gap-3">
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-bold text-white">{product.name}</h2>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {product.category ?? "Schweizer Nährwertdatenbank"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Metric label="kcal/100g" value={formatMacro(product.caloriesPer100g)} />
            <Metric label="Protein" value={formatMacro(product.proteinPer100g, "g")} />
            <Metric label="Carbs" value={formatMacro(product.carbsPer100g, "g")} />
            <Metric label="Fat" value={formatMacro(product.fatPer100g, "g")} />
          </div>
        </div>
      </div>

      {!canLog ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Calories are unknown. Logging is disabled for this product.
        </p>
      ) : (
        <form action={logFoodProduct} className="mt-4 grid gap-3">
          <input name="code" type="hidden" value={product.code} />
          <input name="name" type="hidden" value={product.name} />
          <input name="brand" type="hidden" value={product.brand ?? ""} />
          <input name="source" type="hidden" value={product.source} />
          <input name="image_url" type="hidden" value={product.imageUrl ?? ""} />
          <input name="serving_size" type="hidden" value={product.servingSize ?? ""} />
          <input name="cal100" type="hidden" value={product.caloriesPer100g ?? ""} />
          <input name="protein100" type="hidden" value={product.proteinPer100g ?? ""} />
          <input name="carbs100" type="hidden" value={product.carbsPer100g ?? ""} />
          <input name="fat100" type="hidden" value={product.fatPer100g ?? ""} />
          <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
            <label className="grid gap-2 text-sm font-bold text-zinc-300">
              Grams
              <input
                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base text-white outline-none focus:border-[var(--accent)]"
                defaultValue="100"
                min="1"
                name="grams"
                step="1"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-300">
              Meal
              <select
                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base text-white outline-none focus:border-[var(--accent)]"
                defaultValue={selectedSlot}
                name="meal_slot"
              >
                <option value="">Infer</option>
                {mealSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="min-h-12 rounded-full bg-[var(--accent)] px-4 text-sm font-bold text-black shadow-sm shadow-[var(--accent)]/20"
            type="submit"
          >
            Log product
          </button>
        </form>
      )}
    </article>
  );
}

function ProductImage({ product }: { product: NormalizedFoodProduct }) {
  if (!product.imageUrl) {
    return (
      <div className="grid size-20 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-lg font-bold text-[var(--accent)]">
        {product.name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className="size-20 shrink-0 rounded-2xl border border-[var(--border)] object-cover"
      src={product.imageUrl}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function formatMacro(value: number | null, unit = "") {
  if (value === null) {
    return "unknown";
  }

  return `${Math.round(value * 10) / 10}${unit}`;
}
