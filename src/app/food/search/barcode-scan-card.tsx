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
        className="flex min-h-12 w-full items-center gap-3 px-4 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--surface-2)]"
        onClick={() => setScannerOpen(true)}
        type="button"
      >
        <Barcode className="size-4" />
        Scan barcode
      </button>
    </>
  );
}
