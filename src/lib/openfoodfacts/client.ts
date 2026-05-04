import type {
  NormalizedOpenFoodFactsProduct,
  OpenFoodFactsSearchResult,
} from "./types";

const baseUrl = "https://world.openfoodfacts.org";
const userAgent = "Errday/1.0 (contact: replace-with-real-email)";
const fields = [
  "code",
  "product_name",
  "brands",
  "image_front_url",
  "image_url",
  "serving_size",
  "nutriments",
].join(",");

type OpenFoodFactsProductResponse = {
  product?: RawOpenFoodFactsProduct;
  status?: number;
  status_verbose?: string;
};

type OpenFoodFactsSearchResponse = {
  products?: RawOpenFoodFactsProduct[];
};

type RawOpenFoodFactsProduct = {
  brands?: unknown;
  code?: unknown;
  image_front_url?: unknown;
  image_url?: unknown;
  nutriments?: Record<string, unknown>;
  product_name?: unknown;
  serving_size?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeProduct(
  product: RawOpenFoodFactsProduct,
): NormalizedOpenFoodFactsProduct | null {
  const code = asString(product.code);
  const name = asString(product.product_name);

  if (!code || !name) {
    return null;
  }

  const nutriments = product.nutriments ?? {};
  const caloriesKcal = asNumber(nutriments["energy-kcal_100g"]);
  const energyKj = asNumber(nutriments["energy-kj_100g"]);
  const caloriesPer100g =
    caloriesKcal ?? (energyKj === null ? null : energyKj / 4.184);

  return {
    brand: asString(product.brands),
    caloriesPer100g,
    carbsPer100g: asNumber(nutriments.carbohydrates_100g),
    code,
    fatPer100g: asNumber(nutriments.fat_100g),
    imageUrl: asString(product.image_front_url) ?? asString(product.image_url),
    name,
    proteinPer100g: asNumber(nutriments.proteins_100g),
    servingSize: asString(product.serving_size),
    source: "open_food_facts",
  };
}

type FetchJsonResult<T> = {
  data: T | null;
  error: "rate_limited" | "unavailable" | null;
};

async function fetchJson<T>(url: string): Promise<FetchJsonResult<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      next: {
        revalidate: 60 * 60,
      },
    });

    if (!response.ok) {
      console.error(`[OpenFoodFacts] ${response.status} ${response.statusText}`);
      return {
        data: null,
        error:
          response.status === 429 || response.status === 503
            ? "rate_limited"
            : "unavailable",
      };
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      console.error("[OpenFoodFacts] non-JSON response");
      return { data: null, error: "rate_limited" };
    }

    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    console.error("[OpenFoodFacts] request failed", error);
    return { data: null, error: "unavailable" };
  }
}

export async function getProductByBarcode(barcode: string) {
  const cleanBarcode = barcode.replace(/\D/g, "");

  if (!cleanBarcode) {
    return null;
  }

  const url = `${baseUrl}/api/v2/product/${encodeURIComponent(
    cleanBarcode,
  )}.json?fields=${encodeURIComponent(fields)}`;
  const { data } = await fetchJson<OpenFoodFactsProductResponse>(url);

  if (!data?.product || data.status === 0) {
    return null;
  }

  return normalizeProduct(data.product);
}

export async function searchProducts(
  query: string,
): Promise<OpenFoodFactsSearchResult> {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return { error: null, products: [] };
  }

  const params = new URLSearchParams({
    action: "process",
    fields,
    json: "1",
    page_size: "20",
    search_simple: "1",
    search_terms: cleanQuery,
  });
  const { data, error } = await fetchJson<OpenFoodFactsSearchResponse>(
    `${baseUrl}/cgi/search.pl?${params.toString()}`,
  );

  if (!data) {
    return {
      error:
        error === "rate_limited"
          ? "OpenFoodFacts is temporarily limiting anonymous requests. Try again later or use the manual food log for now."
          : "OpenFoodFacts is unavailable right now. Try again shortly.",
      products: [],
    };
  }

  return {
    error: null,
    products: (data.products ?? [])
      .map(normalizeProduct)
      .filter((product): product is NormalizedOpenFoodFactsProduct => {
        return product !== null;
      }),
  };
}
