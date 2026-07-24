export const dailyScoreInsightOptions = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "steps", label: "Steps" },
  { key: "water", label: "Water" },
  { key: "sleep", label: "Sleep" },
] as const;

export type DailyScoreInsightKey = (typeof dailyScoreInsightOptions)[number]["key"];

export const defaultDailyScoreInsights: DailyScoreInsightKey[] = [
  "calories",
  "steps",
  "sleep",
];

export function normalizeDailyScoreInsights(
  values: readonly string[] | null | undefined,
): DailyScoreInsightKey[] {
  const allowed = new Set<DailyScoreInsightKey>(
    dailyScoreInsightOptions.map((option) => option.key),
  );
  const selected = (values ?? []).filter(
    (value): value is DailyScoreInsightKey => allowed.has(value as DailyScoreInsightKey),
  );

  return selected.length === 3 ? selected : defaultDailyScoreInsights;
}
