"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  deleteCalendarEvent,
  insertCalendarEvent,
  updateCalendarEvent,
} from "@/lib/db/calendar";
import type { ActionState } from "@/lib/forms";
import { formString, integerValue, nullableString } from "@/lib/forms";
import type { CalendarCategory } from "@/types/database";

const categories = new Set<CalendarCategory>([
  "workout",
  "meal",
  "sleep",
  "reminder",
  "general",
]);

type ParsedEventForm =
  | { error: string; event?: never }
  | {
      error?: never;
      event: {
        category: CalendarCategory;
        date: string;
        description: string | null;
        end_time: string | null;
        location: string | null;
        reminder_minutes: number | null;
        start_time: string | null;
        title: string;
      };
    };

function parseEventForm(formData: FormData): ParsedEventForm {
  const title = formString(formData, "title");
  const date = formString(formData, "date");
  const startTime = nullableString(formData, "start_time");
  const endTime = nullableString(formData, "end_time");
  const rawCategory = formString(formData, "category");
  const category: CalendarCategory = categories.has(
    rawCategory as CalendarCategory,
  )
    ? (rawCategory as CalendarCategory)
    : "general";
  const reminderMinutes = integerValue(formData, "reminder_minutes");

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "A title and a valid date are required." };
  }

  if (startTime && endTime && endTime <= startTime) {
    return { error: "The end time must be after the start time." };
  }

  return {
    event: {
      category,
      date,
      description: nullableString(formData, "description"),
      end_time: startTime ? endTime : null,
      location: nullableString(formData, "location"),
      reminder_minutes:
        reminderMinutes !== null && reminderMinutes >= 0
          ? Math.min(reminderMinutes, 10080)
          : null,
      start_time: startTime,
      title,
    },
  };
}

export async function saveCalendarEvent(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseEventForm(formData);

  if (parsed.error !== undefined) {
    return { status: "error", message: parsed.error };
  }

  const eventId = nullableString(formData, "event_id");

  try {
    if (eventId) {
      await updateCalendarEvent(supabase, user.id, eventId, parsed.event);
    } else {
      await insertCalendarEvent(supabase, {
        ...parsed.event,
        user_id: user.id,
      });
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save the event.",
    };
  }

  revalidatePath("/calendar");
  revalidatePath("/today");
  return {
    status: "success",
    message: eventId ? "Event updated." : "Event added.",
  };
}

export async function removeCalendarEvent(eventId: string) {
  const { supabase, user } = await requireUser();
  await deleteCalendarEvent(supabase, user.id, eventId);
  revalidatePath("/calendar");
  revalidatePath("/today");
}
