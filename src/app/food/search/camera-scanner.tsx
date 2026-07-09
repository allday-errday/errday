"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { HelpCircle, Images, X, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ScanMode = "food" | "barcode" | "label";

type CameraScannerProps = {
  onBarcode: (code: string) => void;
  onClose: () => void;
  onPhoto: (blob: Blob, mode: ScanMode) => void;
};

const modes: { hint: string; label: string; value: ScanMode }[] = [
  { hint: "Point at your meal", label: "Scan Food", value: "food" },
  { hint: "Point at the barcode", label: "Barcode", value: "barcode" },
  { hint: "Point at the nutrition table", label: "Food label", value: "label" },
];

export function CameraScanner({
  onBarcode,
  onClose,
  onPhoto,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerControlsRef = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ScanMode>("food");
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [ready, setReady] = useState(false);

  // Start the back camera once, and stop every track on unmount.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device has no camera access in the browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as
          | (MediaTrackCapabilities & { torch?: boolean })
          | undefined;
        setTorchSupported(Boolean(capabilities?.torch));
        setReady(true);
      } catch {
        setError("Camera access was blocked. Allow it, or pick a photo.");
      }
    }

    void start();
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      readerControlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      body.style.overflow = previousOverflow;
    };
  }, []);

  // Run the continuous barcode reader only while in barcode mode.
  useEffect(() => {
    if (mode !== "barcode" || !ready || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    reader
      .decodeFromVideoElement(videoRef.current, (result) => {
        if (stopped || !result) return;
        const text = result.getText().replace(/\D/g, "");
        if (/^\d{8,14}$/.test(text)) {
          stopped = true;
          readerControlsRef.current?.stop();
          onBarcode(text);
        }
      })
      .then((controls) => {
        if (stopped) {
          controls.stop();
          return;
        }
        readerControlsRef.current = controls;
      })
      .catch(() => setError("Barcode scanning is not available here."));

    return () => {
      stopped = true;
      readerControlsRef.current?.stop();
      readerControlsRef.current = null;
    };
  }, [mode, ready, onBarcode]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        // torch is a non-standard constraint, supported on some Androids.
        advanced: [{ torch: next }] as unknown as MediaTrackConstraintSet[],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onPhoto(blob, mode);
      },
      "image/jpeg",
      0.85,
    );
  }

  const activeHint = modes.find((entry) => entry.value === mode)?.hint ?? "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white">
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPhoto(file, mode === "barcode" ? "food" : mode);
        }}
        ref={fileRef}
        type="file"
      />

      {/* Live camera */}
      <video
        autoPlay
        className="absolute inset-0 size-full object-cover"
        muted
        playsInline
        ref={videoRef}
      />

      {/* Dark gradient for control legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between p-4">
        <button
          aria-label="Close scanner"
          className="grid size-11 place-items-center rounded-full bg-black/45 backdrop-blur"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
        <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold backdrop-blur">
          {activeHint}
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-black/45 text-zinc-300 backdrop-blur">
          <HelpCircle className="size-5" />
        </span>
      </div>

      {/* Framing brackets */}
      <div className="relative flex flex-1 items-center justify-center px-10">
        <div className="relative aspect-square w-full max-w-sm">
          {[
            "left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl",
            "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl",
          ].map((corner) => (
            <span
              className={`absolute size-14 border-white/90 ${corner}`}
              key={corner}
            />
          ))}
        </div>
      </div>

      {error ? (
        <div className="relative mx-6 mb-3 rounded-2xl bg-black/60 p-4 text-center text-sm text-amber-200 backdrop-blur">
          {error}
          <button
            className="mt-3 block w-full rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            Choose from library
          </button>
        </div>
      ) : null}

      {/* Mode tabs */}
      <div className="relative mx-4 mb-3 grid grid-cols-3 gap-2">
        {modes.map((entry) => (
          <button
            className={`min-h-14 rounded-2xl px-2 text-sm font-bold transition ${
              mode === entry.value
                ? "bg-white text-black"
                : "bg-white/12 text-zinc-200 backdrop-blur"
            }`}
            key={entry.value}
            onClick={() => setMode(entry.value)}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="relative flex items-center justify-between px-8 pb-8">
        <button
          aria-label="Toggle flash"
          className={`grid size-12 place-items-center rounded-full backdrop-blur transition ${
            torchSupported ? "bg-black/45" : "invisible"
          } ${torchOn ? "text-amber-300" : "text-white"}`}
          onClick={toggleTorch}
          type="button"
        >
          {torchOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
        </button>

        {mode === "barcode" ? (
          <div className="grid size-20 place-items-center">
            <span className="text-xs font-semibold text-zinc-300">
              Scanning…
            </span>
          </div>
        ) : (
          <button
            aria-label="Capture photo"
            className="grid size-20 place-items-center rounded-full border-4 border-white/40 active:scale-95"
            disabled={!ready}
            onClick={capture}
            type="button"
          >
            <span className="size-16 rounded-full bg-white" />
          </button>
        )}

        <button
          aria-label="Choose from library"
          className="grid size-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          <Images className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
