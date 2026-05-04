import type { ComponentProps } from "react";

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

export function Field({ children, label }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function inputClassName(className = "") {
  return `min-h-12 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:border-[#FF69B4]/70 ${className}`;
}

export type TextInputProps = ComponentProps<"input">;
