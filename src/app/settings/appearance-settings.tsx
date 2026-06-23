"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "@/components/toaster";
import {
  ACCENT_PRESETS,
  applyTheme,
  DARK_BACKGROUND_PRESETS,
  DEFAULT_THEME,
  LIGHT_BACKGROUND_PRESETS,
  MODE_BACKGROUNDS,
  parseTheme,
  SECONDARY_PRESETS,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type BackdropStyle,
  type ColorMode,
  type ThemePreferences,
} from "@/lib/theme";

const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_THEME);

function getThemeSnapshot() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_SNAPSHOT;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function getServerThemeSnapshot() {
  return DEFAULT_SNAPSHOT;
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

const backdropOptions: Array<{
  description: string;
  label: string;
  value: BackdropStyle;
}> = [
  { description: "Subtle structure", label: "Grid", value: "grid" },
  { description: "Soft color glow", label: "Aura", value: "aura" },
  { description: "Pure and minimal", label: "Clean", value: "clean" },
];

export function AppearanceSettings() {
  const snapshot = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const theme = parseTheme(snapshot);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ThemePreferences>(DEFAULT_THEME);
  const backgroundPresets =
    draft.mode === "light"
      ? LIGHT_BACKGROUND_PRESETS
      : DARK_BACKGROUND_PRESETS;

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openStudio() {
    setDraft(theme);
    setOpen(true);
  }

  function saveTheme() {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(draft));
      applyTheme(draft);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      setOpen(false);
      toast("Appearance updated");
    } catch {
      toast("Theme could not be saved");
    }
  }

  return (
    <>
      <section className="surface-panel mb-5 overflow-hidden p-5 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="eyebrow">Appearance</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-white">
              Make Errday yours.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Switch between dark and light, then tune the background and accent colors for the whole website.
            </p>
            <button
              className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-5 text-sm font-extrabold text-[#111218] transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
              onClick={openStudio}
              type="button"
            >
              Customize theme
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <ThemePreview theme={theme} compact />
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-3 sm:p-6">
          <button
            aria-label="Close appearance settings"
            className="fixed inset-0 cursor-default bg-black/75 backdrop-blur-md"
            onClick={() => setOpen(false)}
            type="button"
          />
          <section
            aria-labelledby="appearance-title"
            aria-modal="true"
            className="relative my-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-soft)] shadow-[0_40px_140px_rgba(0,0,0,0.35)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.08] px-5 py-5 sm:px-8 sm:py-6">
              <div>
                <p className="eyebrow">Theme studio</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white sm:text-3xl" id="appearance-title">
                  Shape your space.
                </h2>
              </div>
              <button
                aria-label="Close"
                autoFocus
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 text-xl text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="grid max-h-[70vh] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
              <div className="space-y-8 p-5 sm:p-8">
                <ModeSection
                  onChange={(mode) =>
                    setDraft((current) => ({
                      ...current,
                      background: MODE_BACKGROUNDS[mode],
                      mode,
                    }))
                  }
                  value={draft.mode}
                />
                <ColorSection
                  colors={backgroundPresets}
                  label="Background"
                  onChange={(background) => setDraft((current) => ({ ...current, background }))}
                  value={draft.background}
                />
                <ColorSection
                  colors={ACCENT_PRESETS}
                  label="Main color"
                  onChange={(accent) => setDraft((current) => ({ ...current, accent }))}
                  value={draft.accent}
                />
                <ColorSection
                  colors={SECONDARY_PRESETS}
                  label="Secondary color"
                  onChange={(secondary) => setDraft((current) => ({ ...current, secondary }))}
                  value={draft.secondary}
                />

                <fieldset>
                  <legend className="text-sm font-extrabold text-white">Background style</legend>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {backdropOptions.map((option) => {
                      const selected = draft.backdrop === option.value;
                      return (
                        <button
                          aria-pressed={selected}
                          className={`rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                              : "border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/20"
                          }`}
                          key={option.value}
                          onClick={() => setDraft((current) => ({ ...current, backdrop: option.value }))}
                          type="button"
                        >
                          <span className="block text-sm font-extrabold">{option.label}</span>
                          <span className="mt-1 hidden text-xs sm:block">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="border-t border-[var(--border)] bg-[var(--surface-2)] p-5 sm:p-8 lg:border-l lg:border-t-0">
                <p className="text-sm font-extrabold text-white">Live preview</p>
                <p className="mt-1 text-xs text-zinc-500">A quick look before you apply it.</p>
                <div className="mt-5 lg:sticky lg:top-8">
                  <ThemePreview theme={draft} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-4 sm:gap-3 sm:px-8">
              <button
                className="min-h-11 rounded-full px-2 text-sm font-bold text-zinc-500 transition hover:text-white sm:px-4"
                onClick={() => setDraft(DEFAULT_THEME)}
                type="button"
              >
                Reset
              </button>
              <div className="flex min-w-0 gap-2">
                <button
                  className="min-h-11 rounded-full border border-white/10 px-4 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.05] sm:px-5"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="min-h-11 whitespace-nowrap rounded-full bg-white px-5 text-sm font-extrabold text-[#111218] transition hover:bg-[var(--accent-strong)] sm:px-6"
                  onClick={saveTheme}
                  type="button"
                >
                  Apply theme
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ModeSection({
  onChange,
  value,
}: {
  onChange: (mode: ColorMode) => void;
  value: ColorMode;
}) {
  const options: Array<{
    description: string;
    icon: string;
    label: string;
    value: ColorMode;
  }> = [
    {
      description: "Deep, calm and focused",
      icon: "☾",
      label: "Dark",
      value: "dark",
    },
    {
      description: "Bright, soft and airy",
      icon: "☀",
      label: "Light",
      value: "light",
    },
  ];

  return (
    <fieldset>
      <legend className="text-sm font-extrabold text-white">Interface mode</legend>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              aria-pressed={selected}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-4 ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]"
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg ${
                  selected
                    ? "bg-[var(--accent)] text-[#111218]"
                    : "bg-[var(--surface-3)] text-zinc-500"
                }`}
              >
                {option.icon}
              </span>
              <span>
                <span className="block text-sm font-extrabold text-white">
                  {option.label}
                </span>
                <span className="mt-1 hidden text-xs text-zinc-500 sm:block">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ColorSection({
  colors,
  label,
  onChange,
  value,
}: {
  colors: ReadonlyArray<{ color: string; label: string }>;
  label: string;
  onChange: (color: string) => void;
  value: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-extrabold text-white">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">
          Custom
          <span className="size-7 rounded-full border border-white/20 p-0.5" style={{ backgroundColor: value }} />
          <input
            aria-label={`Custom ${label.toLowerCase()}`}
            className="sr-only"
            onChange={(event) => onChange(event.target.value)}
            type="color"
            value={value}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {colors.map((color) => {
          const selected = value.toLowerCase() === color.color.toLowerCase();
          return (
            <button
              aria-label={color.label}
              aria-pressed={selected}
              className={`group flex items-center gap-2 rounded-full border py-2 pl-2 pr-3 text-xs font-bold transition ${
                selected
                  ? "border-white/30 bg-white/[0.08] text-white"
                  : "border-white/[0.07] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
              }`}
              key={color.color}
              onClick={() => onChange(color.color)}
              type="button"
            >
              <span className="size-5 rounded-full ring-1 ring-white/10" style={{ backgroundColor: color.color }} />
              {color.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ThemePreview({ compact = false, theme }: { compact?: boolean; theme: ThemePreferences }) {
  const isLight = theme.mode === "light";
  const previewText = isLight ? "#171922" : "#ffffff";
  const previewMuted = isLight
    ? "rgba(23,25,34,0.52)"
    : "rgba(255,255,255,0.45)";
  const previewBorder = isLight
    ? "rgba(23,25,34,0.12)"
    : "rgba(255,255,255,0.1)";
  const previewSurface = isLight
    ? "rgba(255,255,255,0.68)"
    : "rgba(255,255,255,0.04)";
  const previewImage =
    theme.backdrop === "clean"
      ? "none"
      : theme.backdrop === "grid"
        ? `linear-gradient(${theme.accent}10 1px, transparent 1px), linear-gradient(90deg, ${theme.accent}10 1px, transparent 1px), radial-gradient(circle at 85% 0%, ${theme.accent}45, transparent 48%)`
        : `radial-gradient(circle at 85% 0%, ${theme.accent}45, transparent 48%)`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-2xl shadow-black/15 ${compact ? "h-44" : "h-72"}`}
      style={{
        backgroundColor: theme.background,
        backgroundImage: previewImage,
        backgroundSize:
          theme.backdrop === "grid"
            ? "22px 22px, 22px 22px, auto, auto"
            : undefined,
        borderColor: previewBorder,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: previewBorder }}
      >
        <span className="text-xs font-extrabold" style={{ color: previewText }}>
          errday
        </span>
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: theme.accent }} />
          <span className="size-2 rounded-full" style={{ backgroundColor: theme.secondary }} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_0.65fr] gap-3 p-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.accent}24` }}>
          <p
            className="text-[0.55rem] font-bold uppercase tracking-[0.16em]"
            style={{ color: previewMuted }}
          >
            Daily flow
          </p>
          <p
            className="mt-3 text-4xl font-extrabold tracking-[-0.08em]"
            style={{ color: previewText }}
          >
            84
          </p>
          <div
            className="mt-4 h-1 rounded-full"
            style={{ backgroundColor: previewBorder }}
          >
            <div className="h-full w-4/5 rounded-full" style={{ backgroundColor: theme.accent }} />
          </div>
        </div>
        <div className="grid gap-2">
          {["Fuel", "Move", "Sleep"].map((label, index) => (
            <div
              className="rounded-lg border p-2"
              key={label}
              style={{
                backgroundColor: previewSurface,
                borderColor: previewBorder,
              }}
            >
              <span
                className="block text-[0.55rem] font-bold"
                style={{ color: previewMuted }}
              >
                {label}
              </span>
              <span
                className="mt-1 block text-xs font-extrabold"
                style={{ color: previewText }}
              >
                {index === 0 ? "72%" : index === 1 ? "91%" : "8h"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-4 h-1 rounded-full" style={{ backgroundColor: theme.secondary }} />
    </div>
  );
}
