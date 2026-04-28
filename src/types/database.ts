export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "athlete";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Profile {
  id: string;
  sex: Sex | null;
  birthdate: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal: Goal | null;
  target_weight_kg: number | null;
  target_rate_kg_per_week: number | null;
  activity_level: ActivityLevel | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  reminders_enabled: boolean | null;
  meal_reminder_time: string | null;
  supplement_reminder_time: string | null;
  gym_reminder_time: string | null;
  gym_rest_end_reminder_enabled: boolean | null;
  sleep_reminder_time: string | null;
  journal_reminder_time: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Pick<Profile, "id"> &
  Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

export interface BodyWeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  note: string | null;
  created_at: string;
}

export type BodyWeightLogInsert = Omit<BodyWeightLog, "id" | "created_at">;

export interface FoodEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  name: string;
  amount: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  note: string | null;
  created_at: string;
}

export type FoodEntryInsert = Omit<FoodEntry, "id" | "created_at">;

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number;
  quality: number | null;
  bedtime: string | null;
  wake_time: string | null;
  note: string | null;
  created_at: string;
}

export type SleepLogInsert = Omit<SleepLog, "id" | "created_at">;

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export type JournalEntryInsert = Omit<
  JournalEntry,
  "id" | "created_at" | "updated_at"
>;

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  name: string;
  note: string | null;
  created_at: string;
}

export type WorkoutInsert = Omit<Workout, "id" | "created_at">;

export interface WorkoutSet {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  note: string | null;
  created_at: string;
}

export type WorkoutSetInsert = Omit<WorkoutSet, "id" | "created_at">;

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  category: string;
  instructions: string | null;
  image_key: string | null;
  is_custom: boolean;
  created_at: string;
}

export type ExerciseInsert = Omit<Exercise, "id" | "created_at">;

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type WorkoutTemplateInsert = Omit<
  WorkoutTemplate,
  "id" | "created_at"
>;

export interface WorkoutTemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: string | null;
  note: string | null;
  created_at: string;
}

export interface ActiveWorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: string | null;
  note: string | null;
  created_at: string;
}

export type WorkoutExerciseInsert = Omit<
  WorkoutExercise,
  "id" | "created_at"
>;

export interface HabitLog {
  id: string;
  user_id: string;
  date: string;
  name: string;
  completed: boolean;
  created_at: string;
}

export type HabitLogInsert = Omit<HabitLog, "id" | "created_at">;

export type WorkoutWithSets = Workout & {
  workout_sets: WorkoutSet[];
};

export type WorkoutExerciseWithExercise = WorkoutExercise & {
  exercises: Exercise | null;
};

export type WorkoutWithDetails = Workout & {
  workout_exercises: WorkoutExerciseWithExercise[];
  workout_sets: WorkoutSet[];
};
