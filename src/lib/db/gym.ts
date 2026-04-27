import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkoutInsert,
  WorkoutSetInsert,
  WorkoutWithSets,
} from "@/types/database";

export async function listWorkouts(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_sets(*)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("set_number", {
      ascending: true,
      referencedTable: "workout_sets",
    })
    .limit(10)
    .returns<WorkoutWithSets[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createWorkout(
  supabase: SupabaseClient,
  workout: WorkoutInsert,
) {
  const { error } = await supabase.from("workouts").insert(workout);

  if (error) {
    throw error;
  }
}

export async function createWorkoutSet(
  supabase: SupabaseClient,
  set: WorkoutSetInsert,
) {
  const { error } = await supabase.from("workout_sets").insert(set);

  if (error) {
    throw error;
  }
}

export async function deleteWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
) {
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
