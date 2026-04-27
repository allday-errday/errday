"use client";

import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import type { Profile } from "@/types/database";
import { saveProfile } from "./actions";

type SettingsFormProps = {
  profile: Profile | null;
};

export function SettingsForm({ profile }: SettingsFormProps) {
  const [state, formAction] = useActionState(saveProfile, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sex">
          <select
            className={inputClassName()}
            defaultValue={profile?.sex ?? ""}
            name="sex"
            required
          >
            <option value="" disabled>
              Select
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Birthdate">
          <input
            className={inputClassName()}
            defaultValue={profile?.birthdate ?? ""}
            name="birthdate"
            required
            type="date"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Height cm">
          <input
            className={inputClassName()}
            defaultValue={profile?.height_cm ?? ""}
            min="1"
            name="height_cm"
            required
            step="0.1"
            type="number"
          />
        </Field>
        <Field label="Weight kg">
          <input
            className={inputClassName()}
            defaultValue={profile?.current_weight_kg ?? ""}
            min="1"
            name="current_weight_kg"
            required
            step="0.1"
            type="number"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Goal">
          <select
            className={inputClassName()}
            defaultValue={profile?.goal ?? ""}
            name="goal"
            required
          >
            <option value="" disabled>
              Select
            </option>
            <option value="lose">Lose</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain</option>
          </select>
        </Field>
        <Field label="Activity">
          <select
            className={inputClassName()}
            defaultValue={profile?.activity_level ?? ""}
            name="activity_level"
            required
          >
            <option value="" disabled>
              Select
            </option>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="very_active">Very active</option>
            <option value="athlete">Athlete</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target kg">
          <input
            className={inputClassName()}
            defaultValue={profile?.target_weight_kg ?? ""}
            min="1"
            name="target_weight_kg"
            step="0.1"
            type="number"
          />
        </Field>
        <Field label="Rate kg/week">
          <input
            className={inputClassName()}
            defaultValue={profile?.target_rate_kg_per_week ?? ""}
            min="0"
            name="target_rate_kg_per_week"
            step="0.05"
            type="number"
          />
        </Field>
      </div>

      <FormMessage state={state} />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
