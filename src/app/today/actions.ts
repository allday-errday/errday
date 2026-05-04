"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { todayDateString } from "@/lib/dates";
import { createWaterLog, upsertDaySetting } from "@/lib/db/daily-flow";
import { formString, integerValue } from "@/lib/forms";
import type { DayType } from "@/types/database";

const dayTypes: DayType[] = ["rest", "gym"];
const waterAmounts = [250, 500];

export async function setTodayDayType(formData: FormData) {
  const { supabase, user } = await requireUser();
  const dayType = formString(formData, "day_type") as DayType;

  if (!dayTypes.includes(dayType)) {
    return;
  }

  await upsertDaySetting(supabase, user.id, todayDateString(), dayType);
  revalidatePath("/today");
}

export async function logWater(formData: FormData) {
  const { supabase, user } = await requireUser();
  const amountMl = integerValue(formData, "amount_ml");

  if (!amountMl || !waterAmounts.includes(amountMl)) {
    return;
  }

  await createWaterLog(supabase, user.id, amountMl);
  revalidatePath("/today");
}
