"use client";

import { Camera, Check, LoaderCircle, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { MealAnalysis } from "@/lib/ai/meal-analysis";
import type { ScanMode } from "./camera-scanner";

// Lazy-loaded so the camera + barcode library only ships when opened.
const CameraScanner = dynamic(
  () => import("./camera-scanner").then((module) => module.CameraScanner),
  { ssr: false },
);

const labelHint =
  "This photo shows a product's nutrition label (Nährwerttabelle). Read the values and estimate one typical serving as eaten.";

type Status = "idle" | "analyzing" | "ready" | "logging" | "logged" | "error";

// Cap the longest edge so camera photos upload fast and stay under limits.
async function downscaleImage(file: File, maxDim = 1024): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82);
  });
}

function formatMacro(value: number) {
  return Math.round(value * 10) / 10;
}

export function MealSnap({ onLogged }: { onLogged?: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const busy = status === "analyzing" || status === "logging";

  function handleScannedPhoto(blob: Blob, mode: ScanMode) {
    setScannerOpen(false);
    const file = new File([blob], "meal.jpg", {
      type: blob.type || "image/jpeg",
    });
    void analyze(file, mode === "label" ? labelHint : text);
  }

  function handleScannedBarcode(code: string) {
    setScannerOpen(false);
    router.push(`/food/search?barcode=${encodeURIComponent(code)}`);
  }

  function setPreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  async function analyze(file?: File, describeText?: string) {
    setStatus("analyzing");
    setError(null);
    setAnalysis(null);

    const formData = new FormData();
    if (describeText?.trim()) formData.set("text", describeText.trim());

    if (file) {
      setPreview(URL.createObjectURL(file));
      try {
        const blob = await downscaleImage(file);
        formData.set("image", new File([blob], "meal.jpg", { type: "image/jpeg" }));
      } catch {
        formData.set("image", file);
      }
    } else {
      setPreview(null);
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
        setError(data.error ?? "The AI could not analyze this. Try again.");
        setStatus("error");
        return;
      }

      if (!data.analysis.foodDetected) {
        setError(
          data.analysis.note ??
            "No food detected. Try a clearer photo or describe the meal.",
        );
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

  function reset() {
    setStatus("idle");
    setAnalysis(null);
    setError(null);
    setText("");
    setPreview(null);
  }

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 sm:p-5">
      {scannerOpen ? (
        <CameraScanner
          onBarcode={handleScannedBarcode}
          onClose={() => setScannerOpen(false)}
          onPhoto={handleScannedPhoto}
        />
      ) : null}

      {status === "idle" || status === "error" ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Sparkles className="size-4 text-[var(--accent)]" />
            Snap or describe a meal
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            The AI estimates the real portion — total calories, not per 100 g.
          </p>

          <div className="mt-3 grid gap-2 sm:flex">
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110"
              onClick={() => setScannerOpen(true)}
              type="button"
            >
              <Camera className="size-5" />
              Scan food
            </button>
            <div className="flex min-w-0 flex-1 gap-2">
              <input
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-base text-white outline-none focus:border-[var(--accent)]"
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && text.trim()) {
                    event.preventDefault();
                    void analyze(undefined, text);
                  }
                }}
                placeholder="…or describe it: bowl of pasta"
                type="text"
                value={text}
              />
              <button
                className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-extrabold text-zinc-200 transition hover:text-white disabled:opacity-40"
                disabled={!text.trim()}
                onClick={() => void analyze(undefined, text)}
                type="button"
              >
                Estimate
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-amber-300">{error}</p>
          ) : null}
        </div>
      ) : null}

      {status === "analyzing" ? (
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Meal"
              className="size-14 shrink-0 rounded-xl object-cover"
              src={previewUrl}
            />
          ) : null}
          <span className="flex items-center gap-2 text-sm font-bold text-white">
            <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" />
            Analyzing the portion…
          </span>
        </div>
      ) : null}

      {(status === "ready" || status === "logging" || status === "logged") &&
      analysis ? (
        <article>
          <div className="flex items-start gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Meal"
                className="size-16 shrink-0 rounded-xl object-cover"
                src={previewUrl}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-white">{analysis.name}</h3>
              <p className="mt-0.5 text-sm font-semibold text-zinc-400">
                {analysis.amount}
                {analysis.servingGrams ? ` · ${analysis.servingGrams} g` : ""}
              </p>
            </div>
            <p className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-black text-[var(--on-accent)]">
              {Math.round(analysis.calories)} kcal
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Metric label="Protein" value={`${formatMacro(analysis.proteinG)} g`} />
            <Metric label="Carbs" value={`${formatMacro(analysis.carbsG)} g`} />
            <Metric label="Fat" value={`${formatMacro(analysis.fatG)} g`} />
          </div>

          {analysis.assumptions.length > 0 && status !== "logged" ? (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Assumptions: {analysis.assumptions.join("; ")}
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          {status === "logged" ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
                <Check className="size-4" />
                Logged into today
              </p>
              <button
                className="min-h-10 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-zinc-200 transition hover:text-white"
                onClick={reset}
                type="button"
              >
                Snap another
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button
                className="min-h-12 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110 disabled:opacity-60"
                disabled={busy}
                onClick={() => void logMeal()}
                type="button"
              >
                {status === "logging" ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin" />
                    Logging…
                  </span>
                ) : (
                  `Log · ${Math.round(analysis.calories)} kcal`
                )}
              </button>
              <button
                aria-label="Discard"
                className="grid size-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-zinc-400 transition hover:text-white disabled:opacity-60"
                disabled={busy}
                onClick={reset}
                type="button"
              >
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
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}
