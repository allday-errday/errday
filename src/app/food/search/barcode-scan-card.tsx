"use client";

import { Barcode, Camera } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CameraScanner = dynamic(
  () => import("./camera-scanner").then((module) => module.CameraScanner),
  { ssr: false },
);

export function BarcodeScanCard() {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  function handleBarcode(barcode: string) {
    setScannerOpen(false);
    router.push(`/food/search?barcode=${encodeURIComponent(barcode)}`);
  }

  return (
    <section className="mb-5 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 sm:p-5">
      {scannerOpen ? (
        <CameraScanner
          onBarcode={handleBarcode}
          onClose={() => setScannerOpen(false)}
        />
      ) : null}

      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
          <Barcode className="size-5" />
        </span>
        <div>
          <h2 className="font-extrabold text-white">Scan barcode</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Point your camera at a product barcode to find its nutrition facts.
          </p>
        </div>
      </div>
      <button
        className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110"
        onClick={() => setScannerOpen(true)}
        type="button"
      >
        <Camera className="size-5" />
        Scan barcode
      </button>
    </section>
  );
}
