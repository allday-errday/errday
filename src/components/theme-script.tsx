import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

const themeBootScript = `
  (() => {
    try {
      const fallback = ${JSON.stringify(DEFAULT_THEME)};
      const stored = JSON.parse(localStorage.getItem("${THEME_STORAGE_KEY}") || "null") || fallback;
      const hex = (value, defaultValue) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : defaultValue;
      const backdrop = ["grid", "aura", "clean"].includes(stored.backdrop) ? stored.backdrop : fallback.backdrop;
      const mode = ["dark", "light"].includes(stored.mode) ? stored.mode : fallback.mode;
      const root = document.documentElement;
      root.style.setProperty("--bg", hex(stored.background, fallback.background));
      root.style.setProperty("--accent", hex(stored.accent, fallback.accent));
      root.style.setProperty("--signal", hex(stored.secondary, fallback.secondary));
      root.dataset.backdrop = backdrop;
      root.dataset.mode = mode;
    } catch {}
  })();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
}
