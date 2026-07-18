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
        aria-label="Scan barcode"
        className="grid size-12 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)] shadow-sm shadow-[var(--accent)]/25 transition hover:brightness-110 active:scale-95"
        onClick={() => setScannerOpen(true)}
        title="Scan barcode"
        type="button"
      >
        <Barcode className="size-5" />
      </button>
    </>
  );
}
