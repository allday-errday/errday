import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loggableMealAnalysisSchema,
  mealDisplayName,
  validMealSlot,
} from "@/lib/ai/meal-analysis";
import { detectDayType, inferNextMealSlot } from "@/lib/daily-flow/plan";
import { todayDateString } from "@/lib/dates";
import { getDaySetting } from "@/lib/db/daily-flow";
import {
  createFoodItem,
  createFoodLog,
  listFoodLogsForDay,
} from "@/lib/db/food";
import { listWorkoutLogsForDay } from "@/lib/db/gym";
import { getTodayWorkouts } from "@/lib/db/today";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const logRequestSchema = z.object({
  analysis: loggableMealAnalysisSchema,
  mealSlot: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let input: z.infer<typeof logRequestSchema>;
  try {
    input = logRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid meal estimate." }, { status: 400 });
  }

  const today = todayDateString();
  const requestedSlot =
    validMealSlot(input.mealSlot) ?? validMealSlot(input.analysis.mealSlot);

  try {
    const [foodLogs, workoutLogs, workouts, daySetting] = await Promise.all([
      listFoodLogsForDay(supabase, user.id, today),
      listWorkoutLogsForDay(supabase, user.id, today),
      getTodayWorkouts(supabase, user.id, today),
      getDaySetting(supabase, user.id, today),
    ]);
    const dayType =
      daySetting?.day_type ?? detectDayType({ workoutLogs, workouts });
    const mealSlot =
      requestedSlot ??
      inferNextMealSlot({ dayType, foodLogs, workoutLogs, workouts });
    const analysis = input.analysis;
    const displayName = mealDisplayName(analysis);
    const servingSize = analysis.servingGrams
      ? `${analysis.servingGrams} g`
      : analysis.amount;

    const foodItem = await createFoodItem(supabase, {
      user_id: user.id,
      name: analysis.name,
      brand: "Errday AI",
      calories_per_serving: Math.round(analysis.calories),
      protein_g: analysis.proteinG,
      carbs_g: analysis.carbsG,
      fat_g: analysis.fatG,
      serving_label: analysis.amount,
      image_url: null,
      barcode: null,
      external_source: "coach_ai",
      external_id: null,
      serving_size: servingSize,
    });

    await createFoodLog(supabase, {
      user_id: user.id,
      food_item_id: foodItem.id,
      logged_at: new Date().toISOString(),
      servings: 1,
      calories: Math.round(analysis.calories),
      protein_g: analysis.proteinG,
      carbs_g: analysis.carbsG,
      fat_g: analysis.fatG,
      meal_slot: mealSlot,
      source: "coach_ai",
      external_food_id: null,
      display_name: displayName,
    });

    revalidatePath("/food");
    revalidatePath("/today");

    return NextResponse.json({
      logged: true,
      meal: {
        name: displayName,
        calories: Math.round(analysis.calories),
        mealSlot,
      },
    });
  } catch (error) {
    console.error("Analyzed meal log failed", error);
    return NextResponse.json(
      { error: "Could not log this meal. Try again." },
      { status: 500 },
    );
  }
}
