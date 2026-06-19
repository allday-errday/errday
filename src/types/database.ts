export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active"
  | "athlete";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DayType = "rest" | "gym";
export type MealSlot =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_workout"
  | "post_workout";
export type PlanSlot = MealSlot | "workout" | "sleep";
export type PlanStatus = "logged" | "upcoming" | "missed";

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

export interface FoodItem {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_label: string;
  image_url: string | null;
  barcode: string | null;
  external_source: string | null;
  external_id: string | null;
  serving_size: string | null;
  created_at: string;
}

export type FoodItemInsert = Omit<FoodItem, "id" | "created_at">;

export interface FoodLog {
  id: string;
  user_id: string;
  food_item_id: string;
  logged_at: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_slot: MealSlot | null;
  source: string;
  external_food_id: string | null;
  display_name: string | null;
  created_at: string;
}

export type FoodLogInsert = Omit<FoodLog, "id" | "created_at">;

export type FoodLogWithItem = FoodLog & {
  food_items: FoodItem | null;
};

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

export interface WorkoutProgram {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type WorkoutProgramInsert = Pick<WorkoutProgram, "user_id" | "name"> &
  Partial<Omit<WorkoutProgram, "id" | "created_at" | "updated_at">>;

export interface WorkoutTemplate {
  id: string;
  user_id: string | null;
  program_id: string | null;
  position: number;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  estimated_minutes: number;
  estimated_calories: number | null;
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

export type WorkoutTemplateExerciseWithExercise = WorkoutTemplateExercise & {
  exercises: Exercise | null;
};

export type WorkoutTemplateWithExercises = WorkoutTemplate & {
  workout_template_exercises: WorkoutTemplateExerciseWithExercise[];
};

export type WorkoutTemplateWithCount = WorkoutTemplate & {
  workout_template_exercises: { count: number }[];
};

export interface ActiveWorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_template_id: string | null;
  name: string;
  category: string;
  duration_minutes: number;
  calories_burned: number;
  logged_at: string;
  started_at: string | null;
  ended_at: string | null;
  plan_slot: Extract<PlanSlot, "workout"> | null;
  notes: string | null;
  created_at: string;
}

export type WorkoutLogInsert = Omit<WorkoutLog, "id" | "created_at">;

export type WorkoutLogWithTemplate = WorkoutLog & {
  workout_templates: WorkoutTemplate | null;
};

export interface NutritionTarget {
  user_id: string;
  sex: Sex | null;
  birthdate: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
  created_at: string;
  updated_at: string;
}

export type NutritionTargetInsert = Omit<
  NutritionTarget,
  "created_at" | "updated_at"
>;

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

export interface DailyProfile {
  user_id: string;
  default_day_type: DayType;
  sleep_goal_hours: number;
  water_goal_ml: number;
  suggested_bedtime: string;
  created_at: string;
  updated_at: string;
}

export type DailyProfileInsert = Pick<DailyProfile, "user_id"> &
  Partial<Omit<DailyProfile, "user_id" | "created_at" | "updated_at">>;

export interface DailyDaySetting {
  id: string;
  user_id: string;
  date: string;
  day_type: DayType;
  created_at: string;
  updated_at: string;
}

export type DailyDaySettingInsert = Omit<
  DailyDaySetting,
  "id" | "created_at" | "updated_at"
>;

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

export type WaterLogInsert = Omit<WaterLog, "id" | "logged_at" | "created_at"> &
  Partial<Pick<WaterLog, "logged_at">>;

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
