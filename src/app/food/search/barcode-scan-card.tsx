"use client";

import { Barcode } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CameraScanner = dynamic(
  () => import("./camera-scanner").then((module) => module.CameraScanner),
  { ssr: false },
);

export function BarcodeScanButton() {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  function handleBarcode(barcode: string) {
    setScannerOpen(false);
    router.push(`/food/search?barcode=${encodeURIComponent(barcode)}`);
  }

  return (
    <>
      {scannerOpen ? (
        <CameraScanner
          onBarcode={handleBarcode}
          onClose={() => setScannerOpen(false)}
        />
      ) : null}
      <button
        className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-bold text-zinc-300 transition hover:border-[var(--accent)]/50 hover:text-white active:scale-95"
        onClick={() => setScannerOpen(true)}
        type="button"
      >
        <Barcode className="size-4" />
        Scan barcode
      </button>
    </>
  );
}
