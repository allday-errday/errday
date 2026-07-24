"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
} & Omit<React.ComponentProps<"button">, "children" | "disabled" | "type">;

export function SubmitButton({
  children,
  className = "",
  pendingLabel = "Saving...",
  variant = "primary",
  onClick,
  ...buttonProps
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current !== null) {
        window.clearTimeout(cooldownTimer.current);
      }
    };
  }, []);

  const classes = {
    primary:
      "bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-strong)] disabled:bg-white/40 disabled:text-black/50",
    secondary:
      "border border-[var(--border-strong)] bg-[var(--surface-2)] text-zinc-100 hover:bg-[var(--surface-3)] disabled:text-zinc-500",
    danger:
      "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:text-red-400/50",
  };

  return (
    <button
      {...buttonProps}
      className={`min-h-12 rounded-lg px-5 text-sm font-bold transition disabled:cursor-not-allowed ${classes[variant]} ${className}`}
      disabled={pending || isCoolingDown}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const form = event.currentTarget.form;
        if (form && !form.checkValidity()) return;
        setIsCoolingDown(true);
        if (cooldownTimer.current !== null) {
          window.clearTimeout(cooldownTimer.current);
        }
        cooldownTimer.current = window.setTimeout(() => {
          setIsCoolingDown(false);
        }, 3_000);
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
