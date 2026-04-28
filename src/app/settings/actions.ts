"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import { upsertBodyWeightLog, upsertProfile } from "@/lib/db/profile";
import type { ActionState } from "@/lib/forms";
import { formString, nullableString, numberValue } from "@/lib/forms";
import {
  calculateAgeFromBirthdate,
  calculateBmr,
  calculateMacroTargets,
  calculateTargetCalories,
  calculateTdee,
} from "@/lib/nutrition/calculations";
import type { ActivityLevel, Goal, Sex } from "@/types/database";

const sexes = ["male", "female"];
const goals = ["lose", "maintain", "gain"];
const activityLevels = [
  "sedentary",
  "light",
  "moderate",
  "very_active",
  "athlete",
];

function validOption<T extends string>(value: string, options: string[]) {
  return options.includes(value) ? (value as T) : null;
}

export async function saveProfile(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const sex = validOption<Sex>(formString(formData, "sex"), sexes);
  const birthdate = nullableString(formData, "birthdate");
  const heightCm = numberValue(formData, "height_cm");
  const currentWeightKg = numberValue(formData, "current_weight_kg");
  const goal = validOption<Goal>(formString(formData, "goal"), goals);
  const targetWeightKg = numberValue(formData, "target_weight_kg");
  const targetRateKgPerWeek = numberValue(
    formData,
    "target_rate_kg_per_week",
  );
  const activityLevel = validOption<ActivityLevel>(
    formString(formData, "activity_level"),
    activityLevels,
  );

  if (!sex || !birthdate || !heightCm || !currentWeightKg || !goal || !activityLevel) {
    return {
      status: "error",
      message: "Sex, birthdate, height, current weight, goal and activity are required.",
    };
  }

  const age = calculateAgeFromBirthdate(birthdate);
  const bmr = calculateBmr({
    sex,
    weightKg: currentWeightKg,
    heightCm,
    age,
  });
  const tdee = calculateTdee({ bmr, activityLevel });
  const calorieTarget = calculateTargetCalories({
    tdee,
    goal,
    targetRateKgPerWeek,
  });
  const macros = calculateMacroTargets({
    calories: calorieTarget,
    weightKg: currentWeightKg,
    goal,
  });

  try {
    await upsertProfile(supabase, {
      id: user.id,
      sex,
      birthdate,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
      goal,
      target_weight_kg: targetWeightKg,
      target_rate_kg_per_week: targetRateKgPerWeek,
      activity_level: activityLevel,
      calorie_target: calorieTarget,
      protein_target_g: macros.proteinG,
      carbs_target_g: macros.carbsG,
      fat_target_g: macros.fatG,
    });

    await upsertBodyWeightLog(supabase, {
      user_id: user.id,
      date: todayDateString(),
      weight_kg: currentWeightKg,
      note: "Saved from profile settings.",
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not save profile.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/today");

  return {
    status: "success",
    message: "Profile saved and targets updated.",
  };
}

export async function logout() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function saveReminderSettings(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const remindersEnabled = formString(formData, "reminders_enabled") === "on";
  const gymRestEndReminderEnabled =
    formString(formData, "gym_rest_end_reminder_enabled") === "on";

  try {
    await upsertProfile(supabase, {
      id: user.id,
      reminders_enabled: remindersEnabled,
      meal_reminder_time: nullableString(formData, "meal_reminder_time"),
      supplement_reminder_time: nullableString(formData, "supplement_reminder_time"),
      gym_reminder_time: nullableString(formData, "gym_reminder_time"),
      gym_rest_end_reminder_enabled: gymRestEndReminderEnabled,
      sleep_reminder_time: nullableString(formData, "sleep_reminder_time"),
      journal_reminder_time: nullableString(formData, "journal_reminder_time"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save reminders.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/today");

  return {
    status: "success",
    message: "Reminder settings saved.",
  };
}
