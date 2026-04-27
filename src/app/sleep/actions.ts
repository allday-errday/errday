"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { upsertSleepLog } from "@/lib/db/sleep";
import type { ActionState } from "@/lib/forms";
import {
  formString,
  integerValue,
  nullableString,
  numberValue,
} from "@/lib/forms";

export async function saveSleepLog(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const date = formString(formData, "date");
  const sleepHours = numberValue(formData, "sleep_hours");
  const quality = integerValue(formData, "quality");

  if (!date || sleepHours === null || sleepHours < 0 || sleepHours > 24) {
    return {
      status: "error",
      message: "Date and sleep hours from 0 to 24 are required.",
    };
  }

  try {
    await upsertSleepLog(supabase, {
      user_id: user.id,
      date,
      sleep_hours: sleepHours,
      quality,
      bedtime: nullableString(formData, "bedtime"),
      wake_time: nullableString(formData, "wake_time"),
      note: nullableString(formData, "note"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save sleep log.",
    };
  }

  revalidatePath("/sleep");
  revalidatePath("/today");
  return { status: "success", message: "Sleep log saved." };
}
