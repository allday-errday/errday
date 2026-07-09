"use client";

import { Images, X, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CameraScannerProps = {
  onClose: () => void;
  onPhoto: (blob: Blob) => void;
};

export function CameraScanner({ onClose, onPhoto }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [ready, setReady] = useState(false);

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
        setError("Camera access was blocked. Allow it, or choose a photo.");
      }
    }

    void start();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const next = !torchOn;
    try {
      await track.applyConstraints({
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
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onPhoto(blob);
      },
      "image/jpeg",
      0.85,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white">
      <input
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPhoto(file);
        }}
        ref={fileRef}
        type="file"
      />

      <video
        autoPlay
        className="absolute inset-0 size-full object-cover"
        muted
        playsInline
        ref={videoRef}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" />

      <div className="relative flex items-center justify-between p-4">
        <button
          aria-label="Close camera"
          className="grid size-11 place-items-center rounded-full bg-black/45 backdrop-blur"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
        <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold backdrop-blur">
          Take a photo of your meal
        </span>
        <span className="size-11" aria-hidden="true" />
      </div>

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

        <button
          aria-label="Capture photo"
          className="grid size-20 place-items-center rounded-full border-4 border-white/40 active:scale-95 disabled:opacity-50"
          disabled={!ready}
          onClick={capture}
          type="button"
        >
          <span className="size-16 rounded-full bg-white" />
        </button>

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
