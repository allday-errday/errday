import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkoutProgram,
  WorkoutTemplate,
  WorkoutTemplateWithCount,
  WorkoutTemplateWithExercises,
} from "@/types/database";

export async function listPrograms(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<WorkoutProgram[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getProgram(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<WorkoutProgram>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createProgram(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; description?: string | null; image_url?: string | null },
) {
  const { count } = await supabase
    .from("workout_programs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data, error } = await supabase
    .from("workout_programs")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      position: count ?? 0,
    })
    .select("*")
    .single<WorkoutProgram>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProgram(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("workout_programs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function listRoutines(
  supabase: SupabaseClient,
  userId: string,
  programId: string,
) {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*, workout_template_exercises(count)")
    .eq("user_id", userId)
    .eq("program_id", programId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<WorkoutTemplateWithCount[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createRoutine(
  supabase: SupabaseClient,
  userId: string,
  programId: string,
  name: string,
) {
  const { count } = await supabase
    .from("workout_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("program_id", programId);

  const { data, error } = await supabase
    .from("workout_templates")
    .insert({
      user_id: userId,
      program_id: programId,
      name,
      category: "strength",
      position: count ?? 0,
    })
    .select("*")
    .single<WorkoutTemplate>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateRoutine(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: { name?: string; description?: string | null },
) {
  const { error } = await supabase
    .from("workout_templates")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteRoutine(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getRoutineWithExercises(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*, workout_template_exercises(*, exercises(*))")
    .eq("id", id)
    .eq("user_id", userId)
    .order("position", {
      ascending: true,
      referencedTable: "workout_template_exercises",
    })
    .maybeSingle<WorkoutTemplateWithExercises>();

  if (error) {
    throw error;
  }

  return data;
}

export async function addExerciseToRoutine(
  supabase: SupabaseClient,
  templateId: string,
  exerciseId: string,
) {
  const { count } = await supabase
    .from("workout_template_exercises")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const { error } = await supabase.from("workout_template_exercises").insert({
    template_id: templateId,
    exercise_id: exerciseId,
    position: count ?? 0,
    target_sets: 3,
    target_reps: null,
  });

  if (error) {
    throw error;
  }
}

export async function removeRoutineExercise(
  supabase: SupabaseClient,
  id: string,
) {
  const { error } = await supabase
    .from("workout_template_exercises")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateRoutineExercise(
  supabase: SupabaseClient,
  id: string,
  patch: { target_sets?: number; target_reps?: string | null; note?: string | null },
) {
  const { error } = await supabase
    .from("workout_template_exercises")
    .update(patch)
    .eq("id", id);

  if (error) {
    throw error;
  }
}
