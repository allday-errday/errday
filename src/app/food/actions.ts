"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createFoodEntry, deleteFoodEntry } from "@/lib/db/food";
import type { ActionState } from "@/lib/forms";
import {
  formString,
  integerValue,
  nullableString,
  numberValue,
} from "@/lib/forms";
import type { MealType } from "@/types/database";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

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
