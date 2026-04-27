import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise, ExerciseInsert } from "@/types/database";

type ExerciseFilters = {
  muscle?: string;
};

type CustomExerciseInput = {
  name: string;
  primary_muscle: string;
  equipment: string;
  category: string;
  instructions?: string | null;
};

export function slugifyExerciseName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getExercises(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("primary_muscle", { ascending: true })
    .order("name", { ascending: true })
    .returns<Exercise[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function searchExercises(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  filters: ExerciseFilters = {},
) {
  let request = supabase
    .from("exercises")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("name", { ascending: true });

  if (query) {
    request = request.ilike("name", `%${query}%`);
  }

  if (filters.muscle && filters.muscle !== "All") {
    request = request.eq("primary_muscle", filters.muscle);
  }

  const { data, error } = await request.returns<Exercise[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCustomExercise(
  supabase: SupabaseClient,
  userId: string,
  input: CustomExerciseInput,
) {
  const slug = slugifyExerciseName(input.name);
  const exercise: ExerciseInsert = {
    user_id: userId,
    name: input.name,
    slug,
    primary_muscle: input.primary_muscle,
    secondary_muscles: [],
    equipment: input.equipment || "bodyweight",
    category: input.category || "strength",
    instructions: input.instructions ?? null,
    image_key: slug,
    is_custom: true,
  };

  const { error } = await supabase.from("exercises").insert(exercise);

  if (error) {
    throw error;
  }
}
