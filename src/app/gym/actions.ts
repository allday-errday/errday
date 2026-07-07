"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import { createCustomExercise } from "@/lib/db/exercises";
import {
  addExerciseToWorkout,
  cancelActiveWorkoutSession,
  createWorkout,
  createWorkoutFromExercises,
  createWorkoutLog,
  createWorkoutSet,
  createWorkoutTemplate,
  deleteWorkout,
  finishActiveWorkoutSession,
  getActiveWorkoutSession,
  getWorkoutTemplate,
  startActiveWorkoutSession,
} from "@/lib/db/gym";
import type { ActionState } from "@/lib/forms";
import {
  formString,
  integerValue,
  nullableString,
  numberValue,
} from "@/lib/forms";
import type { Exercise } from "@/types/database";

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
      exercise_id: nullableString(formData, "exercise_id"),
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
  revalidatePath(`/gym/workout/${workoutId}`);
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

export async function startEmptyWorkout() {
  const { supabase, user } = await requireUser();

  // Double-tap guard: one active workout at a time — resume instead.
  const existing = await getActiveWorkoutSession(supabase, user.id);
  if (existing?.workout_id) {
    redirect(`/gym/workout/${existing.workout_id}`);
  }

  const workout = await createWorkout(supabase, {
    user_id: user.id,
    date: todayDateString(),
    name: "Workout",
    note: null,
  });
  await startActiveWorkoutSession(supabase, user.id, workout.id);
  revalidatePath("/gym");
  redirect(`/gym/workout/${workout.id}`);
}

export async function startWorkoutFromSelection(formData: FormData) {
  const { supabase, user } = await requireUser();

  const existing = await getActiveWorkoutSession(supabase, user.id);
  if (existing?.workout_id) {
    redirect(`/gym/workout/${existing.workout_id}`);
  }

  const exerciseIds = formData
    .getAll("exercise_id")
    .filter((value): value is string => typeof value === "string");
  const name = formString(formData, "name") || "Workout";

  if (exerciseIds.length === 0) {
    redirect("/gym/workout/new?error=select-exercise");
  }

  const workout = await createWorkoutFromExercises(supabase, user.id, {
    date: todayDateString(),
    name,
    exercises: exerciseIds.map((exerciseId) => ({
      exercise_id: exerciseId,
      target_sets: 4,
    })),
  });

  await startActiveWorkoutSession(supabase, user.id, workout.id);
  revalidatePath("/gym");
  redirect(`/gym/workout/${workout.id}`);
}

export async function addExerciseToCurrentWorkout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const workoutId = formString(formData, "workout_id");
  const exerciseId = formString(formData, "exercise_id");

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .single<Exercise>();

  if (error) {
    throw error;
  }

  await addExerciseToWorkout(supabase, user.id, workoutId, data);
  revalidatePath(`/gym/workout/${workoutId}`);
}

export async function finishWorkout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const sessionId = formString(formData, "session_id");
  const workoutId = formString(formData, "workout_id");
  const title = formString(formData, "title").slice(0, 120);
  const note = formString(formData, "note").slice(0, 600);

  if (workoutId && (title || note)) {
    const patch: { name?: string; note?: string } = {};
    if (title) patch.name = title;
    if (note) patch.note = note;
    const { error: workoutError } = await supabase
      .from("workouts")
      .update(patch)
      .eq("id", workoutId)
      .eq("user_id", user.id);
    if (workoutError) {
      console.error("Could not update workout title/note", workoutError);
    }
  }

  if (sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("active_workout_sessions")
      .select("*, workouts(*)")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle<{
        id: string;
        started_at: string;
        workout_id: string | null;
        workouts: { name: string | null } | null;
      }>();

    if (sessionError) {
      throw sessionError;
    }

    if (session) {
      const endedAt = new Date();
      const startedAt = new Date(session.started_at);
      const durationMinutes = Math.max(
        0,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 60000),
      );

      await createWorkoutLog(supabase, {
        user_id: user.id,
        workout_template_id: null,
        name: title || (session.workouts?.name ?? "Workout"),
        category: "strength",
        duration_minutes: durationMinutes,
        calories_burned: 0,
        logged_at: endedAt.toISOString(),
        started_at: session.started_at,
        ended_at: endedAt.toISOString(),
        plan_slot: "workout",
        notes: note || "Completed from active workout.",
      });
    }

    await finishActiveWorkoutSession(supabase, user.id, sessionId);
  }

  revalidatePath("/gym");
  revalidatePath("/gym/history");
  redirect("/gym/history?toast=workout");
}

export async function discardWorkout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const workoutId = formString(formData, "workout_id");
  const sessionId = formString(formData, "session_id");

  if (!workoutId) {
    redirect("/gym");
  }

  if (sessionId) {
    await cancelActiveWorkoutSession(supabase, user.id, sessionId);
  }

  await deleteWorkout(supabase, user.id, workoutId);

  revalidatePath("/gym");
  revalidatePath("/gym/history");
  revalidatePath("/today");
  redirect("/gym?toast=discarded");
}

export async function saveCustomExercise(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const name = formString(formData, "name");
  const primaryMuscle = formString(formData, "primary_muscle");

  if (!name || !primaryMuscle) {
    return { status: "error", message: "Name and primary muscle are required." };
  }

  try {
    await createCustomExercise(supabase, user.id, {
      name,
      primary_muscle: primaryMuscle,
      equipment: formString(formData, "equipment") || "bodyweight",
      category: formString(formData, "category") || "strength",
      instructions: nullableString(formData, "instructions"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not create exercise.",
    };
  }

  revalidatePath("/gym/exercises");
  return { status: "success", message: "Custom exercise created." };
}

export async function saveWorkoutTemplate(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const name = formString(formData, "name");

  if (!name) {
    return { status: "error", message: "Template name is required." };
  }

  try {
    await createWorkoutTemplate(supabase, {
      user_id: user.id,
      name,
      description: nullableString(formData, "description"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not create template.",
    };
  }

  revalidatePath("/gym/templates");
  return { status: "success", message: "Template created." };
}

export async function logWorkoutTemplate(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const templateId = formString(formData, "template_id");
  const durationMinutes = integerValue(formData, "duration_minutes");
  const caloriesBurned = integerValue(formData, "calories_burned");

  if (!templateId) {
    return { status: "error", message: "Choose a workout template." };
  }

  const template = await getWorkoutTemplate(supabase, user.id, templateId);

  if (!template) {
    return { status: "error", message: "Workout template not found." };
  }

  try {
    await createWorkoutLog(supabase, {
      user_id: user.id,
      workout_template_id: template.id,
      name: template.name,
      category: template.category,
      duration_minutes: durationMinutes ?? template.estimated_minutes,
      calories_burned: caloriesBurned ?? template.estimated_calories ?? 0,
      logged_at: new Date().toISOString(),
      started_at: null,
      ended_at: null,
      plan_slot: "workout",
      notes: nullableString(formData, "notes"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not log workout.",
    };
  }

  revalidatePath("/gym");
  revalidatePath("/today");
  return { status: "success", message: "Workout logged." };
}
