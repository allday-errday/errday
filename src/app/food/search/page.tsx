import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getProductByBarcode, searchProducts } from "@/lib/openfoodfacts/client";
import type { NormalizedOpenFoodFactsProduct } from "@/lib/openfoodfacts/types";
import type { MealSlot } from "@/types/database";
import { logOpenFoodFactsProduct } from "./actions";

type FoodSearchPageProps = {
  searchParams: Promise<{
    barcode?: string;
    error?: string;
    q?: string;
    slot?: string;
  }>;
};

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
  await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const barcode = params.barcode?.trim() ?? "";
  const selectedSlot = isMealSlot(params.slot) ? params.slot : "";
  const barcodeProduct = barcode ? await getProductByBarcode(barcode) : null;
  const searchResult = query
    ? await searchProducts(query)
    : { error: null, products: [] };
  const products = barcodeProduct
    ? [barcodeProduct]
    : searchResult.products;

  return (
    <div>
      <PageHeader
        subtitle="Search OpenFoodFacts or enter a barcode, then log grams into today."
        title="Log Meal"
      />

      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70">
        <form className="grid gap-3">
          {selectedSlot ? (
            <input name="slot" type="hidden" value={selectedSlot} />
          ) : null}
          <label className="grid gap-2 text-sm font-bold text-zinc-700">
            Search food
            <div className="flex gap-2">
              <input
                className="min-h-12 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-black outline-none focus:border-[#FF69B4]"
                defaultValue={query}
                name="q"
                placeholder="Greek yogurt, pasta, protein bar"
                type="search"
              />
              <button
                className="rounded-lg bg-[#FF69B4] px-4 text-sm font-black text-black"
                type="submit"
              >
                Search
              </button>
            </div>
          </label>
        </form>

        <form className="mt-4 grid gap-2">
          {selectedSlot ? (
            <input name="slot" type="hidden" value={selectedSlot} />
          ) : null}
          <label className="grid gap-2 text-sm font-bold text-zinc-700">
            Barcode
            <div className="flex gap-2">
              <input
                className="min-h-12 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-black outline-none focus:border-[#FF69B4]"
                defaultValue={barcode}
                inputMode="numeric"
                name="barcode"
                placeholder="Enter barcode"
              />
              <button
                className="rounded-lg border border-zinc-200 bg-white px-4 text-sm font-black text-black"
                type="submit"
              >
                Find
              </button>
            </div>
          </label>
        </form>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Camera scanning is not enabled yet. Manual barcode entry is available
          as the stable fallback.
        </p>
      </section>

      {params.error ? <ErrorMessage error={params.error} /> : null}
      {searchResult.error ? <ErrorMessage message={searchResult.error} /> : null}

      {!query && !barcode ? (
        <EmptyState />
      ) : products.length === 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
          <h2 className="font-black text-black">No product found</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Try a more specific name or check the barcode.
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

function EmptyState() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
      <h2 className="font-black text-black">Search or enter a barcode</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Results appear after you submit. Errday will use grams to calculate
        calories and macros.
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
    "not-found": "OpenFoodFacts could not find that product.",
  };

  return (
    <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message ?? messages[error ?? ""] ?? "Something went wrong."}
    </p>
  );
}

function ProductCard({
  product,
  selectedSlot,
}: {
  product: NormalizedOpenFoodFactsProduct;
  selectedSlot: MealSlot | "";
}) {
  const canLog = product.caloriesPer100g !== null;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70">
      <div className="flex gap-3">
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-black text-black">{product.name}</h2>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {product.brand ?? "Unknown brand"}
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
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Calories are unknown. Logging is disabled for this product.
        </p>
      ) : (
        <form action={logOpenFoodFactsProduct} className="mt-4 grid gap-3">
          <input name="code" type="hidden" value={product.code} />
          <div className="grid grid-cols-[1fr_1.2fr] gap-3">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Grams
              <input
                className="min-h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-black outline-none focus:border-[#FF69B4]"
                defaultValue="100"
                min="1"
                name="grams"
                step="1"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Meal
              <select
                className="min-h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-black outline-none focus:border-[#FF69B4]"
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
            className="min-h-12 rounded-full bg-[#FF69B4] px-4 text-sm font-black text-black shadow-sm shadow-[#FF69B4]/20"
            type="submit"
          >
            Log product
          </button>
        </form>
      )}
    </article>
  );
}

function ProductImage({ product }: { product: NormalizedOpenFoodFactsProduct }) {
  if (!product.imageUrl) {
    return (
      <div className="grid size-20 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-black text-[#FF69B4]">
        OFF
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className="size-20 shrink-0 rounded-2xl border border-zinc-200 object-cover"
      src={product.imageUrl}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 font-black text-black">{value}</p>
    </div>
  );
}

function formatMacro(value: number | null, unit = "") {
  if (value === null) {
    return "unknown";
  }

  return `${Math.round(value * 10) / 10}${unit}`;
}
