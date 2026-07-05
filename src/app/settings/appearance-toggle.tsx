"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { ERRDAY_BRAND_THEME, MODE_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.mode = mode;

  // The boot script pins --bg inline for a flash-free dark load; in light
  // mode the stylesheet value must win.
  if (mode === "light") {
    root.style.removeProperty("--bg");
  } else {
    root.style.setProperty("--bg", ERRDAY_BRAND_THEME.background);
  }

  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {}
}

export function AppearanceToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return document.documentElement.dataset.mode === "light" ? "light" : "dark";
  });

  function select(next: ThemeMode) {
    setMode(next);
    applyMode(next);
  }

  const options: { icon: typeof Moon; label: string; value: ThemeMode }[] = [
    { icon: Moon, label: "Dark", value: "dark" },
    { icon: Sun, label: "Light", value: "light" },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {options.map(({ icon: Icon, label, value }) => {
        const active = mode === value;
        return (
          <button
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition ${
              active
                ? "border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--border)] bg-[var(--surface-2)]/70 text-zinc-400 hover:bg-[var(--surface-3)]"
            }`}
            key={value}
            onClick={() => select(value)}
            type="button"
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
