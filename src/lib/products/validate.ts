import "server-only";

export type NutritionInput = {
  kcal100g: number | null;
  protein100g: number | null;
  carbs100g: number | null;
  fat100g: number | null;
  saturatedFat100g: number | null;
  sugar100g: number | null;
  fiber100g: number | null;
  salt100g: number | null;
  sodium100g: number | null;
  servingSizeG: number | null;
};

export type ValidationResult = {
  confidenceScore: number;
  issues: string[];
  plausible: boolean;
};

/**
 * Plausibility rules for cleaned product nutrition:
 * - calories should roughly match protein*4 + carbs*4 + fat*9 (Atwater)
 * - macros must not add up to clearly more than 100 g per 100 g
 * - serving sizes must be plausible
 * - missing core values reduce confidence
 */
export function validateNutrition(input: NutritionInput): ValidationResult {
  const issues: string[] = [];
  let confidence = 1;

  const { carbs100g, fat100g, fiber100g, kcal100g, protein100g, servingSizeG } =
    input;

  const coreValues = [kcal100g, protein100g, carbs100g, fat100g];
  const missingCore = coreValues.filter((value) => value === null).length;
  if (missingCore > 0) {
    issues.push(`${missingCore} core nutrition value(s) missing`);
    confidence -= 0.2 * missingCore;
  }

  if (protein100g !== null && carbs100g !== null && fat100g !== null) {
    const macroSum = protein100g + carbs100g + fat100g + (fiber100g ?? 0);
    if (macroSum > 105) {
      issues.push(`macros add up to ${Math.round(macroSum)} g per 100 g`);
      confidence -= 0.4;
    }

    if (kcal100g !== null) {
      const atwater = protein100g * 4 + carbs100g * 4 + fat100g * 9;
      // Allow slack for fiber, alcohol, polyols and label rounding.
      const tolerance = Math.max(40, atwater * 0.25);
      if (Math.abs(kcal100g - atwater) > tolerance) {
        issues.push(
          `calories (${Math.round(kcal100g)}) do not match macros (~${Math.round(atwater)} kcal)`,
        );
        confidence -= 0.3;
      }
    }
  }

  if (kcal100g !== null && kcal100g > 900) {
    issues.push("more than 900 kcal per 100 g is impossible");
    confidence -= 0.5;
  }

  if (servingSizeG !== null && (servingSizeG <= 0 || servingSizeG > 2000)) {
    issues.push(`implausible serving size (${servingSizeG} g)`);
    confidence -= 0.1;
  }

  const confidenceScore = Math.min(1, Math.max(0, Number(confidence.toFixed(2))));

  return {
    confidenceScore,
    issues,
    plausible: confidenceScore >= 0.5,
  };
}

/** Flag large deviations between two sources (e.g. OCR vs Open Food Facts). */
export function compareSources(
  a: Partial<NutritionInput>,
  b: Partial<NutritionInput>,
): string[] {
  const deviations: string[] = [];
  const fields: (keyof NutritionInput)[] = [
    "kcal100g",
    "protein100g",
    "carbs100g",
    "fat100g",
  ];

  for (const field of fields) {
    const valueA = a[field];
    const valueB = b[field];
    if (valueA == null || valueB == null) continue;

    const reference = Math.max(Math.abs(valueA), Math.abs(valueB), 1);
    if (Math.abs(valueA - valueB) / reference > 0.2) {
      deviations.push(`${field}: ${valueA} vs ${valueB}`);
    }
  }

  return deviations;
}
