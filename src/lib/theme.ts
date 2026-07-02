export const ERRDAY_BRAND_THEME = {
  accent: "#8b82f6",
  background: "#15171c",
  backdrop: "grid",
  mode: "dark",
  secondary: "#c4bcff",
} as const;

export type ThemeMode = "dark" | "light";

export const MODE_STORAGE_KEY = "errday.mode";
export const LEGACY_THEME_STORAGE_KEY = "errday.appearance";
