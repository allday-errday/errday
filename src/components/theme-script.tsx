import { ERRDAY_BRAND_THEME, LEGACY_THEME_STORAGE_KEY } from "@/lib/theme";

const themeBootScript = `
  (() => {
    const theme = ${JSON.stringify(ERRDAY_BRAND_THEME)};
    const root = document.documentElement;
    root.style.setProperty("--bg", theme.background);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--signal", theme.secondary);
    root.dataset.mode = "dark";
    root.dataset.backdrop = theme.backdrop;
    try {
      localStorage.removeItem("${LEGACY_THEME_STORAGE_KEY}");
    } catch {}
  })();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
}
