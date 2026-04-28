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
      "bg-[#d946ef] text-black hover:bg-[#ec4899] disabled:bg-[#701a75] disabled:text-black/50",
    secondary:
      "border border-white/10 bg-[#151515] text-white hover:bg-[#1c1c1c] disabled:text-zinc-600",
    danger:
      "border border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20 disabled:text-red-100/50",
  };

  return (
    <button
      className={`min-h-12 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed ${classes[variant]}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
