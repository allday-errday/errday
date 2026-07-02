"use server";

import { redirect } from "next/navigation";
import { saveProfile } from "@/app/settings/actions";
import type { ActionState } from "@/lib/forms";

export async function completeOnboarding(
  previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await saveProfile(previousState, formData);

  if (result.status !== "success") {
    return result;
  }

  redirect("/today?toast=profile");
}
