import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActiveWorkoutSession,
  Exercise,
  Workout,
  WorkoutExerciseInsert,
  WorkoutInsert,
  WorkoutLog,
  WorkoutLogInsert,
  WorkoutLogWithTemplate,
  WorkoutSetInsert,
  WorkoutTemplate,
  WorkoutTemplateInsert,
  WorkoutWithDetails,
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
  const { data, error } = await supabase
    .from("workouts")
    .insert(workout)
    .select("*")
    .single<Workout>();

  if (error) {
    throw error;
  }

  return data;
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

export async function createWorkoutFromExercises(
  supabase: SupabaseClient,
  userId: string,
  input: {
    date: string;
    name: string;
    note?: string | null;
    exercises: Array<{
      exercise_id: string;
      target_sets?: number;
      target_reps?: string | null;
      note?: string | null;
    }>;
  },
) {
  const workout = await createWorkout(supabase, {
    user_id: userId,
    date: input.date,
    name: input.name,
    note: input.note ?? null,
  });

  if (input.exercises.length > 0) {
    const rows: WorkoutExerciseInsert[] = input.exercises.map((exercise, index) => ({
      workout_id: workout.id,
      user_id: userId,
      exercise_id: exercise.exercise_id,
      position: index,
      target_sets: exercise.target_sets ?? 4,
      target_reps: exercise.target_reps ?? null,
      note: exercise.note ?? null,
    }));

    const { error } = await supabase.from("workout_exercises").insert(rows);

    if (error) {
      throw error;
    }
  }

  return workout;
}

export async function addExerciseToWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
  exercise: Exercise,
) {
  const { count, error: countError } = await supabase
    .from("workout_exercises")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", workoutId)
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  const { error } = await supabase.from("workout_exercises").upsert(
    {
      workout_id: workoutId,
      user_id: userId,
      exercise_id: exercise.id,
      position: count ?? 0,
      target_sets: 4,
      target_reps: null,
      note: null,
    },
    { onConflict: "workout_id,exercise_id" },
  );

  if (error) {
    throw error;
  }
}

export async function getWorkoutWithSets(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*, exercises(*)), workout_sets(*)")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .order("position", {
      ascending: true,
      referencedTable: "workout_exercises",
    })
    .order("set_number", {
      ascending: true,
      referencedTable: "workout_sets",
    })
    .maybeSingle<WorkoutWithDetails>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getRecentWorkoutsWithSets(
  supabase: SupabaseClient,
  userId: string,
  limit = 12,
) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*, exercises(*)), workout_sets(*)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<WorkoutWithDetails[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function startActiveWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
) {
  const { data, error } = await supabase
    .from("active_workout_sessions")
    .insert({
      user_id: userId,
      workout_id: workoutId,
      status: "active",
    })
    .select("*")
    .single<ActiveWorkoutSession>();

  if (error) {
    throw error;
  }

  return data;
}

export async function finishActiveWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
) {
  const { error } = await supabase
    .from("active_workout_sessions")
    .update({
      ended_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function cancelActiveWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
) {
  const { error } = await supabase
    .from("active_workout_sessions")
    .update({
      ended_at: new Date().toISOString(),
      status: "cancelled",
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getActiveWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("active_workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveWorkoutSession>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listWorkoutTemplates(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .returns<WorkoutTemplate[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createWorkoutTemplate(
  supabase: SupabaseClient,
  template: Pick<WorkoutTemplateInsert, "user_id" | "name" | "description"> &
    Partial<WorkoutTemplateInsert>,
) {
  const { error } = await supabase.from("workout_templates").insert({
    category: "strength",
    estimated_minutes: 45,
    estimated_calories: null,
    image_url: null,
    ...template,
  });

  if (error) {
    throw error;
  }
}

export async function getWorkoutTemplate(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", id)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle<WorkoutTemplate>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listWorkoutLogsForDay(
  supabase: SupabaseClient,
  userId: string,
  date: string,
) {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*, workout_templates(*)")
    .eq("user_id", userId)
    .gte("logged_at", start)
    .lte("logged_at", end)
    .order("logged_at", { ascending: false })
    .returns<WorkoutLogWithTemplate[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createWorkoutLog(
  supabase: SupabaseClient,
  log: WorkoutLogInsert,
) {
  const { data, error } = await supabase
    .from("workout_logs")
    .insert(log)
    .select("*")
    .single<WorkoutLog>();

  if (error) {
    throw error;
  }

  return data;
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
