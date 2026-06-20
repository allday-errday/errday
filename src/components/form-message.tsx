"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/toaster";
import type { ActionState } from "@/lib/forms";

type FormMessageProps = {
  state: ActionState;
  /** Show a global toast on success instead of an inline success message. */
  toastOnSuccess?: boolean;
};

export function FormMessage({ state, toastOnSuccess = true }: FormMessageProps) {
  const lastShown = useRef<ActionState | null>(null);

  useEffect(() => {
    if (
      toastOnSuccess &&
      state.status === "success" &&
      state.message &&
      lastShown.current !== state
    ) {
      lastShown.current = state;
      toast(state.message);
    }
  }, [state, toastOnSuccess]);

  if (!state.message) {
    return null;
  }

  // On success we rely on the toast; only render errors inline (next to the form).
  if (state.status === "success" && toastOnSuccess) {
    return null;
  }

  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.status === "success"
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {state.message}
    </p>
  );
}
