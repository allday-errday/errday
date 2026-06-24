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
      "bg-white text-[#101116] shadow-[0_14px_35px_-18px_rgba(255,255,255,0.7)] hover:bg-[var(--accent-strong)] disabled:bg-white/40 disabled:text-black/50",
    secondary:
      "border border-[var(--border-strong)] bg-[var(--surface-2)] text-zinc-100 hover:bg-[var(--surface-3)] disabled:text-zinc-500",
    danger:
      "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:text-red-400/50",
  };

  return (
    <button
      className={`min-h-12 rounded-xl px-5 text-sm font-extrabold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:transform-none ${classes[variant]}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
