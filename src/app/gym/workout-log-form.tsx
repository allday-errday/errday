"use client";

import { useActionState, useState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import type { WorkoutTemplate } from "@/types/database";
import { logWorkoutTemplate } from "./actions";

type WorkoutLogFormProps = {
  templates: WorkoutTemplate[];
};

export function WorkoutLogForm({ templates }: WorkoutLogFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id ?? "");
  const [state, formAction] = useActionState(
    logWorkoutTemplate,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-zinc-300">
          Choose workout
        </legend>
        <div className="grid gap-2">
          {templates.map((template) => {
            const isSelected = selectedTemplate === template.id;

            return (
              <label
                className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_12px_30px_-22px_var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-2)]/55 hover:border-[var(--border-strong)]"
                }`}
                key={template.id}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  name="template_id"
                  onChange={() => setSelectedTemplate(template.id)}
                  required
                  type="radio"
                  value={template.id}
                />
                <span
                  aria-hidden="true"
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black ${
                    isSelected
                      ? "bg-[var(--accent)] text-[#0b0c10]"
                      : "bg-white/[0.05] text-zinc-500 group-hover:text-white"
                  }`}
                >
                  {template.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {template.category} · {template.estimated_minutes} min
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${
                    isSelected ? "bg-[var(--signal)]" : "bg-white/10"
                  }`}
                />
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Minutes">
          <input
            className={inputClassName()}
            min="0"
            name="duration_minutes"
            placeholder="Auto"
            type="number"
          />
        </Field>
        <Field label="Calories">
          <input
            className={inputClassName()}
            min="0"
            name="calories_burned"
            placeholder="Auto"
            type="number"
          />
        </Field>
      </div>
      <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-3.5">
        <summary className="cursor-pointer text-sm font-bold text-zinc-400">
          Add a note
        </summary>
        <div className="mt-3">
          <Field label="Notes">
            <input
              className={inputClassName()}
              name="notes"
              placeholder="How did it feel?"
              type="text"
            />
          </Field>
        </div>
      </details>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Logging workout...">Log workout</SubmitButton>
    </form>
  );
}
