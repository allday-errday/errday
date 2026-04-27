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
          ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#86efac]"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {state.message}
    </p>
  );
}
