import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";
import { todayDateString } from "@/lib/dates";
import {
  deleteCalendarEvent,
  insertCalendarEvent,
  listCalendarEvents,
} from "@/lib/db/calendar";
import { createFoodItem, createFoodLog } from "@/lib/db/food";
import { aiModelName } from "@/lib/ai/provider";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

// Local models that cannot do function calling through Ollama.
const noToolSupport = [/gemma/i, /llava/i, /moondream/i, /^phi/i];

export function modelSupportsTools(model = aiModelName()) {
  return !noToolSupport.some((pattern) => pattern.test(model));
}

export function buildCoachTools(supabase: SupabaseClient, userId: string) {
  return {
    addCalendarEvent: tool({
      description:
        "Add an event or reminder to the user's Errday calendar. It also syncs to their Apple Calendar. Use when the user asks to schedule, plan, or be reminded of something.",
      inputSchema: z.object({
        title: z.string().min(1).max(200).describe("Short event title"),
        date: dateSchema.describe("Event date, YYYY-MM-DD"),
        startTime: timeSchema
          .optional()
          .describe("Start time HH:MM. Omit for an all-day event."),
        endTime: timeSchema.optional().describe("End time HH:MM"),
        category: z
          .enum(["workout", "meal", "sleep", "reminder", "general"])
          .optional()
          .describe("Event category"),
        reminderMinutes: z
          .number()
          .int()
          .min(0)
          .max(10080)
          .optional()
          .describe("Alert this many minutes before the event"),
        location: z.string().max(200).optional(),
        description: z.string().max(1000).optional(),
      }),
      execute: async (input) => {
        const event = await insertCalendarEvent(supabase, {
          category: input.category ?? "general",
          date: input.date,
          description: input.description ?? null,
          end_time: input.startTime ? (input.endTime ?? null) : null,
          location: input.location ?? null,
          reminder_minutes: input.reminderMinutes ?? null,
          start_time: input.startTime ?? null,
          title: input.title,
          user_id: userId,
        });

        return {
          saved: true,
          event: {
            id: event.id,
            title: event.title,
            date: event.date,
            startTime: event.start_time,
            category: event.category,
          },
        };
      },
    }),

    listCalendarEvents: tool({
      description:
        "List the user's Errday calendar events in a date range. Use before answering questions about their schedule or before adding events, to avoid duplicates.",
      inputSchema: z.object({
        fromDate: dateSchema
          .optional()
          .describe("Start date, defaults to today"),
        toDate: dateSchema
          .optional()
          .describe("End date, defaults to 7 days after fromDate"),
      }),
      execute: async (input) => {
        const fromDate = input.fromDate ?? todayDateString();
        let toDate = input.toDate;
        if (!toDate) {
          const end = new Date(`${fromDate}T00:00:00Z`);
          end.setUTCDate(end.getUTCDate() + 7);
          toDate = end.toISOString().slice(0, 10);
        }

        const events = await listCalendarEvents(
          supabase,
          userId,
          fromDate,
          toDate,
        );

        return {
          fromDate,
          toDate,
          events: events.map((event) => ({
            id: event.id,
            title: event.title,
            date: event.date,
            startTime: event.start_time,
            endTime: event.end_time,
            category: event.category,
            location: event.location,
          })),
        };
      },
    }),

    logMeal: tool({
      description:
        "Log a meal or food with its calories and macros into the user's Errday food diary for today. Use when the user tells you what they ate, or accepts your suggestion to log something. Estimate realistic values when the user does not provide exact numbers, and tell the user they are estimates.",
      inputSchema: z.object({
        name: z.string().min(1).max(120).describe("Short meal or food name"),
        calories: z
          .number()
          .min(0)
          .max(5000)
          .describe("Total kcal for the eaten portion"),
        proteinG: z.number().min(0).max(500).optional().describe("Protein in grams"),
        carbsG: z.number().min(0).max(1000).optional().describe("Carbs in grams"),
        fatG: z.number().min(0).max(500).optional().describe("Fat in grams"),
        mealSlot: z
          .enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"])
          .optional()
          .describe("Which meal of the day this belongs to"),
      }),
      execute: async (input) => {
        const item = await createFoodItem(supabase, {
          user_id: userId,
          name: input.name,
          brand: null,
          calories_per_serving: Math.round(input.calories),
          protein_g: input.proteinG ?? 0,
          carbs_g: input.carbsG ?? 0,
          fat_g: input.fatG ?? 0,
          serving_label: "1 portion",
          image_url: null,
          barcode: null,
          external_source: "coach_ai",
          external_id: null,
          serving_size: null,
        });

        await createFoodLog(supabase, {
          user_id: userId,
          food_item_id: item.id,
          logged_at: new Date().toISOString(),
          servings: 1,
          calories: Math.round(input.calories),
          protein_g: input.proteinG ?? 0,
          carbs_g: input.carbsG ?? 0,
          fat_g: input.fatG ?? 0,
          meal_slot: input.mealSlot ?? null,
          source: "coach_ai",
          external_food_id: null,
          display_name: input.name,
        });

        return {
          logged: true,
          meal: {
            name: input.name,
            calories: Math.round(input.calories),
            mealSlot: input.mealSlot ?? null,
          },
        };
      },
    }),

    deleteCalendarEvent: tool({
      description:
        "Delete one of the user's Errday calendar events by id. Only use after listing events and confirming with the user which one to remove.",
      inputSchema: z.object({
        eventId: z.string().uuid().describe("The event id to delete"),
      }),
      execute: async (input) => {
        await deleteCalendarEvent(supabase, userId, input.eventId);
        return { deleted: true, eventId: input.eventId };
      },
    }),
  };
}
