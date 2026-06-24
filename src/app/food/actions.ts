"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { detectDayType, inferNextMealSlot } from "@/lib/daily-flow/plan";
import { todayDateString } from "@/lib/dates";
import { getDaySetting } from "@/lib/db/daily-flow";
import {
  createFoodEntry,
  createFoodItem,
  createFoodLog,
  deleteFoodEntry,
  deleteFoodLog,
  getFoodItem,
  getFoodItemByExternalId,
  listFoodLogsForDay,
} from "@/lib/db/food";
import { listWorkoutLogsForDay } from "@/lib/db/gym";
import { getTodayWorkouts } from "@/lib/db/today";
import type { ActionState } from "@/lib/forms";
import {
  formString,
  integerValue,
  nullableString,
  numberValue,
} from "@/lib/forms";
import type { MealSlot, MealType } from "@/types/database";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
const manualMacroSource = "errday_manual";
const manualMacroExternalId = "macro_placeholder";
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

function validateNonNegative(value: number | null, label: string) {
  if (value !== null && value < 0) {
    return `${label} cannot be negative.`;
  }

  return null;
}

function macroCalories(input: {
  carbsG: number;
  fatG: number;
  proteinG: number;
}) {
  return Math.round(input.proteinG * 4 + input.carbsG * 4 + input.fatG * 9);
}

async function getOrCreateManualMacroItem(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
) {
  const existing = await getFoodItemByExternalId(
    supabase,
    userId,
    manualMacroSource,
    manualMacroExternalId,
  );

  if (existing) {
    return existing;
  }

  return createFoodItem(supabase, {
    user_id: userId,
    name: "Manual macros",
    brand: "Errday",
    calories_per_serving: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    serving_label: "custom",
    image_url: null,
    barcode: null,
    external_source: manualMacroSource,
    external_id: manualMacroExternalId,
    serving_size: "custom",
  });
}

export async function saveFoodEntry(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const date = formString(formData, "date");
  const mealType = formString(formData, "meal_type");
  const name = formString(formData, "name");
  const calories = integerValue(formData, "calories");

  if (!date || !mealTypes.includes(mealType) || !name || calories === null) {
    return {
      status: "error",
      message: "Date, meal type, name and calories are required.",
    };
  }

  try {
    await createFoodEntry(supabase, {
      user_id: user.id,
      date,
      meal_type: mealType as MealType,
      name,
      amount: nullableString(formData, "amount"),
      calories,
      protein_g: numberValue(formData, "protein_g") ?? 0,
      carbs_g: numberValue(formData, "carbs_g") ?? 0,
      fat_g: numberValue(formData, "fat_g") ?? 0,
      note: nullableString(formData, "note"),
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not save food.",
    };
  }

  revalidatePath("/food");
  revalidatePath("/today");
  return { status: "success", message: "Food entry saved." };
}

export async function removeFoodEntry(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formString(formData, "id");

  if (id) {
    await deleteFoodEntry(supabase, user.id, id);
    revalidatePath("/food");
    revalidatePath("/today");
  }
}

export async function saveFoodLog(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const foodItemId = formString(formData, "food_item_id");
  const servings = numberValue(formData, "servings") ?? 1;

  if (!foodItemId || servings <= 0) {
    return { status: "error", message: "Choose a food and servings." };
  }

  const item = await getFoodItem(supabase, user.id, foodItemId);

  if (!item) {
    return { status: "error", message: "Food item not found." };
  }

  try {
    const today = todayDateString();
    const [existingFoodLogs, workoutLogs, workouts, daySetting] = await Promise.all([
      listFoodLogsForDay(supabase, user.id, today),
      listWorkoutLogsForDay(supabase, user.id, today),
      getTodayWorkouts(supabase, user.id, today),
      getDaySetting(supabase, user.id, today),
    ]);
    const dayType =
      daySetting?.day_type ?? detectDayType({ workoutLogs, workouts });
    const mealSlot = inferNextMealSlot({
      dayType,
      foodLogs: existingFoodLogs,
      workoutLogs,
      workouts,
    });

    await createFoodLog(supabase, {
      user_id: user.id,
      food_item_id: item.id,
      logged_at: new Date().toISOString(),
      servings,
      calories: Math.round(item.calories_per_serving * servings),
      protein_g: Number(item.protein_g) * servings,
      carbs_g: Number(item.carbs_g) * servings,
      fat_g: Number(item.fat_g) * servings,
      meal_slot: mealSlot,
      source: "manual",
      external_food_id: null,
      display_name: item.name,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not log food item.",
    };
  }

  revalidatePath("/food");
  revalidatePath("/today");
  return { status: "success", message: "Food logged." };
}

export async function saveManualMacroLog(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const name = formString(formData, "name") || "Quick macros";
  const amount = nullableString(formData, "amount");
  const displayName = amount ? `${name} (${amount})` : name;
  const caloriesInput = integerValue(formData, "calories");
  const proteinG = numberValue(formData, "protein_g") ?? 0;
  const carbsG = numberValue(formData, "carbs_g") ?? 0;
  const fatG = numberValue(formData, "fat_g") ?? 0;
  const requestedSlot = validMealSlot(formString(formData, "meal_slot"));

  const validationError =
    validateNonNegative(caloriesInput, "Calories") ??
    validateNonNegative(proteinG, "Protein") ??
    validateNonNegative(carbsG, "Carbs") ??
    validateNonNegative(fatG, "Fat");

  if (validationError) {
    return { status: "error", message: validationError };
  }

  const calories = caloriesInput ?? macroCalories({ carbsG, fatG, proteinG });

  if (calories <= 0 && proteinG <= 0 && carbsG <= 0 && fatG <= 0) {
    return {
      status: "error",
      message: "Enter calories or at least one macro.",
    };
  }

  try {
    const today = todayDateString();
    const [existingFoodLogs, workoutLogs, workouts, daySetting] = await Promise.all([
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
        foodLogs: existingFoodLogs,
        workoutLogs,
        workouts,
      });
    const foodItem = await getOrCreateManualMacroItem(supabase, user.id);

    await createFoodLog(supabase, {
      user_id: user.id,
      food_item_id: foodItem.id,
      logged_at: new Date().toISOString(),
      servings: 1,
      calories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      meal_slot: mealSlot,
      source: "manual_macro",
      external_food_id: null,
      display_name: displayName,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save macros.",
    };
  }

  revalidatePath("/food");
  revalidatePath("/today");
  return { status: "success", message: "Macros logged." };
}

export async function removeFoodLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formString(formData, "id");

  if (id) {
    await deleteFoodLog(supabase, user.id, id);
    revalidatePath("/food");
    revalidatePath("/today");
  }
}
