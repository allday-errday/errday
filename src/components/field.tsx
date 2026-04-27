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
  return `min-h-12 rounded-lg border border-white/10 bg-[#0d0d0d] px-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#22c55e]/70 ${className}`;
}

export type TextInputProps = ComponentProps<"input">;
