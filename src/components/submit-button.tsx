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
      "bg-[#FF69B4] text-black hover:bg-[#ff85c4] disabled:bg-[#FF69B4]/40 disabled:text-black/50",
    secondary:
      "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 disabled:text-zinc-400",
    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:text-red-300",
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
