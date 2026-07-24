"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { X, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CameraScannerProps = {
  onBarcode: (code: string) => void;
  onClose: () => void;
};

export function CameraScanner({ onBarcode, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerControlsRef = useRef<IScannerControls | null>(null);
  const barcodeCallbackRef = useRef(onBarcode);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    barcodeCallbackRef.current = onBarcode;
  }, [onBarcode]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device has no camera access in the browser.");
        return;
      }

      try {
        const stream = await requestBackCamera();
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
          | (MediaTrackCapabilities & {
              focusMode?: string[];
              torch?: boolean;
            })
          | undefined;
        if (capabilities?.focusMode?.includes("continuous")) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: "continuous" }] as unknown as MediaTrackConstraintSet[],
            });
          } catch {
            // Some WebKit camera implementations expose this capability but reject the constraint.
          }
        }
        setTorchSupported(Boolean(capabilities?.torch));
        setReady(true);
      } catch {
        setError("Camera access was blocked. Allow it in iPhone Settings, then try again.");
      }
    }

    void start();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      readerControlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!ready || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    reader
      .decodeFromVideoElement(videoRef.current, (result) => {
        if (stopped || !result) return;

        const barcode = result.getText().replace(/\D/g, "");
        if (!/^\d{8,14}$/.test(barcode)) return;

        stopped = true;
        readerControlsRef.current?.stop();
        barcodeCallbackRef.current(barcode);
      })
      .then((controls) => {
        if (stopped) {
          controls.stop();
          return;
        }
        readerControlsRef.current = controls;
      })
      .catch(() => {
        if (!stopped) {
          setError("Barcode scanning is not available right now. Try again in a moment.");
        }
      });

    return () => {
      stopped = true;
      readerControlsRef.current?.stop();
      readerControlsRef.current = null;
    };
  }, [ready]);

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white">
      <video
        autoPlay
        className="absolute inset-0 size-full object-cover"
        muted
        playsInline
        ref={videoRef}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" />

      <div className="scanner-top-controls relative flex items-center justify-between">
        <button
          aria-label="Close scanner"
          className="grid size-11 place-items-center rounded-full bg-black/45 backdrop-blur"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
        <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold backdrop-blur">
          Point at the barcode
        </span>
        <span className="size-11" aria-hidden="true" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-10">
        <div className="relative aspect-[1.5] w-full max-w-sm">
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
        <div className="relative mx-6 mb-3 rounded-xl bg-black/60 p-4 text-center text-sm text-amber-200 backdrop-blur">
          {error}
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

        <div className="grid size-20 place-items-center text-center text-xs font-semibold text-zinc-200">
          {ready ? "Scanning..." : "Starting..."}
        </div>

        <span className="size-12" aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}

async function requestBackCamera() {
  const highQuality: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { exact: "environment" },
      height: { ideal: 1080 },
      width: { ideal: 1920 },
    },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(highQuality);
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        height: { ideal: 720 },
        width: { ideal: 1280 },
      },
    });
  }
}
