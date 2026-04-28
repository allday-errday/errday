"use client";

import type { ActionState } from "@/lib/forms";

type FormMessageProps = {
  state: ActionState;
};

export function FormMessage({ state }: FormMessageProps) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.status === "success"
          ? "border-[#d946ef]/30 bg-[#d946ef]/10 text-[#f0abfc]"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {state.message}
    </p>
  );
}
