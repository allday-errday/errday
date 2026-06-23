export type BackdropStyle = "grid" | "aura" | "clean";
export type ColorMode = "dark" | "light";

export type ThemePreferences = {
  accent: string;
  background: string;
  backdrop: BackdropStyle;
  mode: ColorMode;
  secondary: string;
};

export const THEME_STORAGE_KEY = "errday.appearance";
export const THEME_CHANGE_EVENT = "errday:appearance-change";

export const DEFAULT_THEME: ThemePreferences = {
  accent: "#9488ff",
  background: "#090a0e",
  backdrop: "grid",
  mode: "dark",
  secondary: "#b9f36b",
};

export const DARK_BACKGROUND_PRESETS = [
  { color: "#090a0e", label: "Carbon" },
  { color: "#090e18", label: "Midnight" },
  { color: "#071310", label: "Evergreen" },
  { color: "#160d12", label: "Merlot" },
] as const;

export const LIGHT_BACKGROUND_PRESETS = [
  { color: "#f6f7fb", label: "Cloud" },
  { color: "#f3f0ff", label: "Lavender" },
  { color: "#eef7f3", label: "Mint" },
  { color: "#fff4ef", label: "Peach" },
] as const;

export const MODE_BACKGROUNDS: Record<ColorMode, string> = {
  dark: DEFAULT_THEME.background,
  light: LIGHT_BACKGROUND_PRESETS[0].color,
};

export const ACCENT_PRESETS = [
  { color: "#9488ff", label: "Ultraviolet" },
  { color: "#5b9dff", label: "Electric blue" },
  { color: "#46d7c3", label: "Aqua" },
  { color: "#ff7b9c", label: "Rose" },
  { color: "#ffad5b", label: "Solar" },
] as const;

export const SECONDARY_PRESETS = [
  { color: "#b9f36b", label: "Lime" },
  { color: "#63e6ff", label: "Ice" },
  { color: "#ff8c78", label: "Coral" },
  { color: "#f6d365", label: "Gold" },
  { color: "#e98cff", label: "Orchid" },
] as const;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function parseTheme(value: string | null): ThemePreferences {
  if (!value) return DEFAULT_THEME;

  try {
    const parsed = JSON.parse(value) as Partial<ThemePreferences>;
    return {
      accent: isHexColor(parsed.accent) ? parsed.accent : DEFAULT_THEME.accent,
      background: isHexColor(parsed.background)
        ? parsed.background
        : DEFAULT_THEME.background,
      backdrop:
        parsed.backdrop === "grid" ||
        parsed.backdrop === "aura" ||
        parsed.backdrop === "clean"
          ? parsed.backdrop
          : DEFAULT_THEME.backdrop,
      mode:
        parsed.mode === "light" || parsed.mode === "dark"
          ? parsed.mode
          : DEFAULT_THEME.mode,
      secondary: isHexColor(parsed.secondary)
        ? parsed.secondary
        : DEFAULT_THEME.secondary,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemePreferences) {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.background);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--signal", theme.secondary);
  root.dataset.backdrop = theme.backdrop;
  root.dataset.mode = theme.mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.background);
}
