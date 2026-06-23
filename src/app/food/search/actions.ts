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

function scalePer100g(value: number, grams: number) {
  return value * (grams / 100);
}

async function getOrCreateFoodItem(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  input: {
    name: string;
    brand: string | null;
    source: string;
    code: string;
    imageUrl: string | null;
    servingSize: string | null;
    cal100: number;
    protein100: number;
    carbs100: number;
    fat100: number;
  },
): Promise<FoodItem> {
  const existing = await getFoodItemByExternalId(
    supabase,
    userId,
    input.source,
    input.code,
  );
  if (existing) {
    return existing;
  }

  return createFoodItem(supabase, {
    user_id: userId,
    name: input.name,
    brand: input.brand,
    calories_per_serving: Math.round(input.cal100),
    protein_g: input.protein100,
    carbs_g: input.carbs100,
    fat_g: input.fat100,
    serving_label: "100 g",
    image_url: input.imageUrl,
    barcode: /^\d+$/.test(input.code) ? input.code : null,
    external_source: input.source,
    external_id: input.code,
    serving_size: input.servingSize,
  });
}

export async function logFoodProduct(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = formString(formData, "name");
  const code = formString(formData, "code");
  const cal100 = numberValue(formData, "cal100");
  const grams = numberValue(formData, "grams") ?? 100;
  const requestedSlot = validMealSlot(formString(formData, "meal_slot"));

  if (!name || !code || cal100 === null || grams <= 0) {
    redirect("/food/search?error=invalid-log");
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
    inferNextMealSlot({ dayType, foodLogs, workoutLogs, workouts });

  const protein100 = numberValue(formData, "protein100") ?? 0;
  const carbs100 = numberValue(formData, "carbs100") ?? 0;
  const fat100 = numberValue(formData, "fat100") ?? 0;
  const source = formString(formData, "source") || "swiss_nutrition";

  const foodItem = await getOrCreateFoodItem(supabase, user.id, {
    name,
    brand: formString(formData, "brand") || null,
    source,
    code,
    imageUrl: formString(formData, "image_url") || null,
    servingSize: formString(formData, "serving_size") || null,
    cal100,
    protein100,
    carbs100,
    fat100,
  });

  await createFoodLog(supabase, {
    user_id: user.id,
    food_item_id: foodItem.id,
    logged_at: new Date().toISOString(),
    servings: grams / 100,
    calories: Math.round(scalePer100g(cal100, grams)),
    protein_g: scalePer100g(protein100, grams),
    carbs_g: scalePer100g(carbs100, grams),
    fat_g: scalePer100g(fat100, grams),
    meal_slot: mealSlot,
    source,
    external_food_id: code,
    display_name: name,
  });

  revalidatePath("/today");
  revalidatePath("/food");
  revalidatePath("/food/search");
  redirect("/today?toast=meal");
}
