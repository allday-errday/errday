"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createWorkout, createWorkoutSet, deleteWorkout } from "@/lib/db/gym";
import type { ActionState } from "@/lib/forms";
import {
  formString,
  integerValue,
  nullableString,
  numberValue,
} from "@/lib/forms";

export async function saveWorkout(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const date = formString(formData, "date");
  const name = formString(formData, "name");

  if (!date || !name) {
    return { status: "error", message: "Date and workout name are required." };
  }

  try {
    await createWorkout(supabase, {
      user_id: user.id,
      date,
      name,
      note: nullableString(formData, "note"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not create workout.",
    };
  }

  revalidatePath("/gym");
  revalidatePath("/today");
  return { status: "success", message: "Workout created." };
}

export async function saveWorkoutSet(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const workoutId = formString(formData, "workout_id");
  const exerciseName = formString(formData, "exercise_name");
  const setNumber = integerValue(formData, "set_number");

  if (!workoutId || !exerciseName || !setNumber || setNumber < 1) {
    return {
      status: "error",
      message: "Workout, exercise and set number are required.",
    };
  }

  try {
    await createWorkoutSet(supabase, {
      workout_id: workoutId,
      user_id: user.id,
      exercise_name: exerciseName,
      set_number: setNumber,
      reps: integerValue(formData, "reps"),
      weight_kg: numberValue(formData, "weight_kg"),
      rpe: numberValue(formData, "rpe"),
      note: nullableString(formData, "note"),
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not save set.",
    };
  }

  revalidatePath("/gym");
  revalidatePath("/today");
  return { status: "success", message: "Set added." };
}

export async function removeWorkout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formString(formData, "id");

  if (id) {
    await deleteWorkout(supabase, user.id, id);
    revalidatePath("/gym");
    revalidatePath("/today");
  }
}
