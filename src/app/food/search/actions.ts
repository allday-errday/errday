"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { detectDayType, inferNextMealSlot } from "@/lib/daily-flow/plan";
import { todayDateString } from "@/lib/dates";
import { getDaySetting } from "@/lib/db/daily-flow";
import {
  createFoodItem,
  createFoodLog,
  getFoodItemByExternalId,
  listFoodLogsForDay,
} from "@/lib/db/food";
import { listWorkoutLogsForDay } from "@/lib/db/gym";
import { getTodayWorkouts } from "@/lib/db/today";
import { formString, numberValue } from "@/lib/forms";
import { getProductByBarcode } from "@/lib/openfoodfacts/client";
import type { NormalizedOpenFoodFactsProduct } from "@/lib/openfoodfacts/types";
import type { FoodItem, MealSlot } from "@/types/database";

const mealSlots: MealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre_workout",
  "post_workout",
];

function validMealSlot(value: string): MealSlot | null {
  return mealSlots.includes(value as MealSlot) ? (value as MealSlot) : null;
}

function scalePer100g(value: number | null, grams: number) {
  return value === null ? 0 : value * (grams / 100);
}

async function getOrCreateFoodItem(
  product: NormalizedOpenFoodFactsProduct,
  userId: string,
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
): Promise<FoodItem> {
  const existing = await getFoodItemByExternalId(
    supabase,
    userId,
    product.source,
    product.code,
  );

  if (existing) {
    return existing;
  }

  return createFoodItem(supabase, {
    user_id: userId,
    name: product.name,
    brand: product.brand,
    calories_per_serving: Math.round(product.caloriesPer100g ?? 0),
    protein_g: product.proteinPer100g ?? 0,
    carbs_g: product.carbsPer100g ?? 0,
    fat_g: product.fatPer100g ?? 0,
    serving_label: "100 g",
    image_url: product.imageUrl,
    barcode: product.code,
    external_source: product.source,
    external_id: product.code,
    serving_size: product.servingSize,
  });
}

export async function logOpenFoodFactsProduct(formData: FormData) {
  const { supabase, user } = await requireUser();
  const code = formString(formData, "code");
  const grams = numberValue(formData, "grams") ?? 100;
  const requestedSlot = validMealSlot(formString(formData, "meal_slot"));

  if (!code || grams <= 0) {
    redirect("/food/search?error=invalid-log");
  }

  const product = await getProductByBarcode(code);

  if (!product) {
    redirect("/food/search?error=not-found");
  }

  if (product.caloriesPer100g === null) {
    redirect(`/food/search?barcode=${encodeURIComponent(code)}&error=missing-calories`);
  }

  const today = todayDateString();
  const [foodLogs, workoutLogs, workouts, daySetting] = await Promise.all([
    listFoodLogsForDay(supabase, user.id, today),
    listWorkoutLogsForDay(supabase, user.id, today),
    getTodayWorkouts(supabase, user.id, today),
    getDaySetting(supabase, user.id, today),
  ]);
  const dayType =
    daySetting?.day_type ?? detectDayType({ workoutLogs, workouts });
  const mealSlot =
    requestedSlot ??
    inferNextMealSlot({
      dayType,
      foodLogs,
      workoutLogs,
      workouts,
    });
  const foodItem = await getOrCreateFoodItem(product, user.id, supabase);

  await createFoodLog(supabase, {
    user_id: user.id,
    food_item_id: foodItem.id,
    logged_at: new Date().toISOString(),
    servings: grams / 100,
    calories: Math.round(scalePer100g(product.caloriesPer100g, grams)),
    protein_g: scalePer100g(product.proteinPer100g, grams),
    carbs_g: scalePer100g(product.carbsPer100g, grams),
    fat_g: scalePer100g(product.fatPer100g, grams),
    meal_slot: mealSlot,
    source: product.source,
    external_food_id: product.code,
    display_name: product.name,
  });

  revalidatePath("/today");
  revalidatePath("/food");
  revalidatePath("/food/search");
  redirect("/today?logged=food");
}
