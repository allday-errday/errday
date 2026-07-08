import { z } from "zod";
import type { MealSlot } from "@/types/database";

export const mealSlots = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre_workout",
  "post_workout",
] as const satisfies readonly MealSlot[];

export const mealAnalysisSchema = z.object({
  foodDetected: z.boolean(),
  name: z.string().max(120),
  amount: z.string().max(100),
  servingGrams: z.number().min(1).max(3000).nullable(),
  calories: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(500),
  mealSlot: z.enum(mealSlots).nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  assumptions: z.array(z.string().min(1).max(180)).max(4),
  note: z.string().max(220).nullable(),
});

export const loggableMealAnalysisSchema = mealAnalysisSchema.extend({
  foodDetected: z.literal(true),
  name: z.string().min(1).max(120),
  amount: z.string().min(1).max(100),
  calories: z.number().min(0).max(5000),
});

export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;
export type LoggableMealAnalysis = z.infer<typeof loggableMealAnalysisSchema>;

export function validMealSlot(value: unknown): MealSlot | null {
  return mealSlots.includes(value as MealSlot) ? (value as MealSlot) : null;
}

export function mealDisplayName(analysis: Pick<LoggableMealAnalysis, "amount" | "name">) {
  const amount = analysis.amount.trim();
  const name = analysis.name.trim();

  if (!amount || name.toLowerCase().includes(amount.toLowerCase())) {
    return name;
  }

  return `${name} (${amount})`;
}
