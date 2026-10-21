import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-off importer for USDA FoodData Central generic foods (SR Legacy +
// Foundation). Processes a window of pages per call so it stays well under
// the serverless time limit; call it repeatedly until { done: true }.

type FdcNutrient = {
  name?: string;
  amount?: number;
  unitName?: string;
};

type FdcFood = {
  fdcId: number;
  description?: string;
  foodCategory?: string | { description?: string };
  foodNutrients?: FdcNutrient[];
};

function nutrientValue(nutrients: FdcNutrient[], names: string[], unit?: string) {
  for (const name of names) {
    const match = nutrients.find(
      (n) =>
        n.name === name &&
        typeof n.amount === "number" &&
        (!unit || n.unitName?.toUpperCase() === unit),
    );
    if (match && typeof match.amount === "number") {
      return match.amount;
    }
  }
  return null;
}

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value * 10) / 10));
}

function hasImportAccess(request: Request) {
  const secret = process.env.ADMIN_IMPORT_SECRET?.trim();
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = value === null ? fallback : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 100_000
    ? parsed
    : null;
}

export function GET() {
  return new Response("Method Not Allowed", {
    headers: { Allow: "POST" },
    status: 405,
  });
}

export async function POST(request: Request) {
  if (!process.env.ADMIN_IMPORT_SECRET?.trim()) {
    return NextResponse.json(
      { error: "Admin import is not configured." },
      { status: 503 },
    );
  }
  if (!hasImportAccess(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.FDC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FDC_API_KEY missing" }, { status: 503 });
  }

  const url = new URL(request.url);
  const dataType = url.searchParams.get("type") === "foundation" ? "Foundation" : "SR Legacy";
  const from = positiveInteger(url.searchParams.get("from"), 1);
  const requestedTo = positiveInteger(url.searchParams.get("to"), (from ?? 1) + 9);
  if (from === null || requestedTo === null || requestedTo < from) {
    return NextResponse.json(
      { error: "from and to must be positive integers with to >= from." },
      { status: 400 },
    );
  }
  const to = Math.min(from + 9, requestedTo);

  const admin = createAdminClient();
  let imported = 0;
  let skipped = 0;
  let done = false;

  for (let page = from; page <= to; page += 1) {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/list?dataType=${encodeURIComponent(
        dataType,
      )}&pageSize=200&pageNumber=${page}&api_key=${apiKey}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `FDC responded ${response.status}`, importedSoFar: imported, page },
        { status: 502 },
      );
    }

    const foods = (await response.json()) as FdcFood[];
    if (!Array.isArray(foods) || foods.length === 0) {
      done = true;
      break;
    }

    const rows = foods
      .map((food) => {
        const nutrients = food.foodNutrients ?? [];
        const kcal = nutrientValue(
          nutrients,
          ["Energy", "Energy (Atwater General Factors)", "Energy (Atwater Specific Factors)"],
          "KCAL",
        );
        if (kcal === null || !food.description) {
          skipped += 1;
          return null;
        }

        const category =
          typeof food.foodCategory === "string"
            ? food.foodCategory
            : food.foodCategory?.description ?? null;

        return {
          carbs_100g: clamp(nutrientValue(nutrients, ["Carbohydrate, by difference"]) ?? 0, 100),
          category,
          fat_100g: clamp(nutrientValue(nutrients, ["Total lipid (fat)"]) ?? 0, 100),
          fdc_id: food.fdcId,
          kcal_100g: clamp(kcal, 950),
          name: food.description,
          protein_100g: clamp(nutrientValue(nutrients, ["Protein"]) ?? 0, 100),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length > 0) {
      const { error } = await admin
        .from("generic_foods")
        .upsert(rows, { onConflict: "fdc_id" });
      if (error) {
        return NextResponse.json(
          { error: error.message, importedSoFar: imported, page },
          { status: 500 },
        );
      }
      imported += rows.length;
    }

    if (foods.length < 200) {
      done = true;
      break;
    }
  }

  return NextResponse.json({ dataType, done, from, imported, skipped, to });
}
