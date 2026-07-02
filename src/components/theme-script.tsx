import {
  ERRDAY_BRAND_THEME,
  LEGACY_THEME_STORAGE_KEY,
  MODE_STORAGE_KEY,
} from "@/lib/theme";

const themeBootScript = `
  (() => {
    const theme = ${JSON.stringify(ERRDAY_BRAND_THEME)};
    const root = document.documentElement;
    root.style.setProperty("--bg", theme.background);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--signal", theme.secondary);
    root.dataset.backdrop = theme.backdrop;
    let mode = "dark";
    try {
      if (localStorage.getItem("${MODE_STORAGE_KEY}") === "light") {
        mode = "light";
      }
      localStorage.removeItem("${LEGACY_THEME_STORAGE_KEY}");
    } catch {}
    root.dataset.mode = mode;
    if (mode === "light") {
      root.style.removeProperty("--bg");
    }
  })();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
}
