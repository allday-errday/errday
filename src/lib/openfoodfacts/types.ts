export type OpenFoodFactsSource = "open_food_facts";

export type NormalizedOpenFoodFactsProduct = {
  brand: string | null;
  caloriesPer100g: number | null;
  carbsPer100g: number | null;
  code: string;
  fatPer100g: number | null;
  imageUrl: string | null;
  name: string;
  proteinPer100g: number | null;
  servingSize: string | null;
  source: OpenFoodFactsSource;
};

export type OpenFoodFactsSearchResult = {
  error: string | null;
  products: NormalizedOpenFoodFactsProduct[];
};
