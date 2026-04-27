import type { ActivityLevel, Goal, Sex } from "@/types/database";

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

export function calculateAgeFromBirthdate(birthdate: string): number {
  const birth = new Date(`${birthdate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function calculateBmr(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

export function calculateTdee(input: {
  bmr: number;
  activityLevel: ActivityLevel;
}): number {
  return Math.round(input.bmr * activityFactors[input.activityLevel]);
}

export function calculateTargetCalories(input: {
  tdee: number;
  goal: Goal;
  targetRateKgPerWeek?: number | null;
}): number {
  const weeklyRate = input.targetRateKgPerWeek;
  const rateAdjustment =
    weeklyRate && weeklyRate > 0 ? Math.round((weeklyRate * 7700) / 7) : null;

  if (input.goal === "lose") {
    return input.tdee - (rateAdjustment ?? 500);
  }

  if (input.goal === "gain") {
    return input.tdee + (rateAdjustment ?? 300);
  }

  return input.tdee;
}

export function calculateMacroTargets(input: {
  calories: number;
  weightKg: number;
  goal: Goal;
}): { proteinG: number; carbsG: number; fatG: number } {
  const proteinMultiplier = input.goal === "maintain" ? 1.8 : 2;
  const proteinG = Math.round(input.weightKg * proteinMultiplier);
  const fatG = Math.round((input.calories * 0.25) / 9);
  const caloriesAfterProteinAndFat = input.calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(caloriesAfterProteinAndFat / 4));

  return { proteinG, carbsG, fatG };
}
