import type { ComponentProps } from "react";

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

export function Field({ children, label }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function inputClassName(className = "") {
  return `min-h-12 rounded-xl border border-[var(--border)] bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[var(--accent)]/70 focus:bg-black/30 ${className}`;
}

export type TextInputProps = ComponentProps<"input">;
