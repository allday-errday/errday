"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { upsertJournalEntry } from "@/lib/db/journal";
import type { ActionState } from "@/lib/forms";
import { formString, integerValue, nullableString } from "@/lib/forms";

export async function saveJournalEntry(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const date = formString(formData, "date");

  if (!date) {
    return { status: "error", message: "Date is required." };
  }

  try {
    await upsertJournalEntry(supabase, {
      user_id: user.id,
      date,
      mood: integerValue(formData, "mood"),
      energy: integerValue(formData, "energy"),
      stress: integerValue(formData, "stress"),
      content: nullableString(formData, "content"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save journal.",
    };
  }

  revalidatePath("/journal");
  revalidatePath("/today");
  return { status: "success", message: "Journal entry saved." };
}
