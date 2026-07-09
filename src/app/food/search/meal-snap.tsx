"use client";

import { Camera, Check, LoaderCircle, SlidersHorizontal, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { MealAnalysis } from "@/lib/ai/meal-analysis";

const CameraScanner = dynamic(
  () => import("./camera-scanner").then((module) => module.CameraScanner),
  { ssr: false },
);

type Status = "idle" | "analyzing" | "ready" | "logging" | "logged" | "error";
type EditableNumber = "calories" | "carbsG" | "fatG" | "proteinG";

async function downscaleImage(file: File, maxDim = 1024): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82);
  });
}

function formatMacro(value: number) {
  return Math.round(value * 10) / 10;
}

export function MealSnap({ onLogged }: { onLogged?: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const busy = status === "analyzing" || status === "logging";

  function setPreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  function handleScannedPhoto(blob: Blob) {
    setScannerOpen(false);
    void analyze(
      new File([blob], "meal.jpg", {
        type: blob.type || "image/jpeg",
      }),
    );
  }

  async function analyze(file: File) {
    setStatus("analyzing");
    setError(null);
    setAnalysis(null);
    setEditing(false);
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    try {
      const image = await downscaleImage(file);
      formData.set("image", new File([image], "meal.jpg", { type: "image/jpeg" }));
    } catch {
      formData.set("image", file);
    }

    try {
      const response = await fetch("/api/food/analyze-meal", {
        body: formData,
        method: "POST",
      });
      const data = (await response.json()) as {
        analysis?: MealAnalysis;
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        setError(data.error ?? "The AI could not analyze this photo. Try again.");
        setStatus("error");
        return;
      }

      if (!data.analysis.foodDetected) {
        setError(data.analysis.note ?? "No food detected. Try a clearer photo.");
        setStatus("error");
        return;
      }

      setAnalysis(data.analysis);
      setStatus("ready");
    } catch {
      setError("The AI could not be reached. Try again.");
      setStatus("error");
    }
  }

  async function logMeal() {
    if (!analysis) return;
    setStatus("logging");
    setError(null);

    try {
      const response = await fetch("/api/food/log-analyzed-meal", {
        body: JSON.stringify({ analysis }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        meal?: { calories: number; name: string };
      };

      if (!response.ok || !data.meal) {
        setError(data.error ?? "Could not log this meal.");
        setStatus("ready");
        return;
      }

      setStatus("logged");
      onLogged?.();
    } catch {
      setError("Could not log this meal. Try again.");
      setStatus("ready");
    }
  }

  function updateText(key: "amount" | "name", value: string) {
    setAnalysis((current) => (current ? { ...current, [key]: value } : null));
  }

  function updateNumber(key: EditableNumber, value: string) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setAnalysis((current) =>
      current ? { ...current, [key]: Math.max(0, number) } : null,
    );
  }

  function updateServingGrams(value: string) {
    if (!value.trim()) {
      setAnalysis((current) => (current ? { ...current, servingGrams: null } : null));
      return;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setAnalysis((current) =>
      current ? { ...current, servingGrams: Math.max(1, number) } : null,
    );
  }

  function reset() {
    setStatus("idle");
    setAnalysis(null);
    setError(null);
    setEditing(false);
    setPreview(null);
  }

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 sm:p-5">
      {scannerOpen ? (
        <CameraScanner onClose={() => setScannerOpen(false)} onPhoto={handleScannedPhoto} />
      ) : null}

      {status === "idle" || status === "error" ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Sparkles className="size-4 text-[var(--accent)]" />
            Scan food
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Take a photo. The AI estimates the portion, then you can adjust it before logging.
          </p>
          <button
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110 sm:w-auto"
            onClick={() => setScannerOpen(true)}
            type="button"
          >
            <Camera className="size-5" />
            Take a photo
          </button>
          {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
        </div>
      ) : null}

      {status === "analyzing" ? (
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Meal" className="size-14 shrink-0 rounded-xl object-cover" src={previewUrl} />
          ) : null}
          <span className="flex items-center gap-2 text-sm font-bold text-white">
            <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" />
            Analyzing your meal...
          </span>
        </div>
      ) : null}

      {(status === "ready" || status === "logging" || status === "logged") && analysis ? (
        <article>
          <div className="flex items-start gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Meal" className="size-16 shrink-0 rounded-xl object-cover" src={previewUrl} />
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-white">{analysis.name}</h3>
              <p className="mt-0.5 text-sm font-semibold text-zinc-400">
                {analysis.amount}
                {analysis.servingGrams ? ` - ${analysis.servingGrams} g` : ""}
              </p>
            </div>
            <p className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-black text-[var(--on-accent)]">
              {Math.round(analysis.calories)} kcal
            </p>
          </div>

          {editing ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/65 p-3 sm:grid-cols-2">
              <EditableField label="Meal name" onChange={(value) => updateText("name", value)} value={analysis.name} />
              <EditableField label="Portion" onChange={(value) => updateText("amount", value)} value={analysis.amount} />
              <EditableField label="Calories" onChange={(value) => updateNumber("calories", value)} type="number" value={analysis.calories} />
              <EditableField label="Grams (optional)" onChange={updateServingGrams} type="number" value={analysis.servingGrams ?? ""} />
              <EditableField label="Protein (g)" onChange={(value) => updateNumber("proteinG", value)} type="number" value={analysis.proteinG} />
              <EditableField label="Carbs (g)" onChange={(value) => updateNumber("carbsG", value)} type="number" value={analysis.carbsG} />
              <EditableField label="Fat (g)" onChange={(value) => updateNumber("fatG", value)} type="number" value={analysis.fatG} />
              <button
                className="min-h-12 self-end rounded-xl border border-[var(--accent)]/45 bg-[var(--accent-soft)] px-4 text-sm font-extrabold text-[var(--accent)]"
                onClick={() => setEditing(false)}
                type="button"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Metric label="Protein" value={`${formatMacro(analysis.proteinG)} g`} />
              <Metric label="Carbs" value={`${formatMacro(analysis.carbsG)} g`} />
              <Metric label="Fat" value={`${formatMacro(analysis.fatG)} g`} />
            </div>
          )}

          {analysis.assumptions.length > 0 && status !== "logged" ? (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Assumptions: {analysis.assumptions.join("; ")}
            </p>
          ) : null}
          {error ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}

          {status === "logged" ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
                <Check className="size-4" />
                Logged into today
              </p>
              <button className="min-h-10 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-zinc-200 transition hover:text-white" onClick={reset} type="button">
                Scan another
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
              <button
                className="min-h-12 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-black text-zinc-200 transition hover:text-white disabled:opacity-60"
                disabled={busy}
                onClick={() => setEditing((current) => !current)}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="size-4" />
                  {editing ? "Close edit" : "Customize"}
                </span>
              </button>
              <button
                className="min-h-12 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110 disabled:opacity-60"
                disabled={busy}
                onClick={() => void logMeal()}
                type="button"
              >
                {status === "logging" ? (
                  <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />Logging...</span>
                ) : `Log - ${Math.round(analysis.calories)} kcal`}
              </button>
              <button aria-label="Discard" className="grid size-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-zinc-400 transition hover:text-white disabled:opacity-60" disabled={busy} onClick={reset} type="button">
                <X className="size-5" />
              </button>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function EditableField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "number" | "text";
  value: number | string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-zinc-400">
      {label}
      <input
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
        min={type === "number" ? "0" : undefined}
        onChange={(event) => onChange(event.target.value)}
        step={type === "number" ? "0.1" : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}
