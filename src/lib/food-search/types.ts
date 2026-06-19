export type FoodSource = "usda" | "nutritionix" | "open_food_facts" | "manual";

export type NormalizedFoodProduct = {
  brand: string | null;
  caloriesPer100g: number | null;
  carbsPer100g: number | null;
  code: string;
  fatPer100g: number | null;
  imageUrl: string | null;
  name: string;
  proteinPer100g: number | null;
  servingSize: string | null;
  source: FoodSource;
};

export type FoodSearchResult = {
  error: string | null;
  products: NormalizedFoodProduct[];
};
