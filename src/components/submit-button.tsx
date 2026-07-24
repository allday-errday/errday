"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
};

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

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
      className={`min-h-12 rounded-lg px-5 text-sm font-extrabold transition disabled:cursor-not-allowed ${classes[variant]}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
