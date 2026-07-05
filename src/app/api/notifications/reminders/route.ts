import { NextResponse } from "next/server";
import {
  claimPushDelivery,
  listAllPushSubscriptions,
} from "@/lib/db/push-subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dueRemindersForSubscription } from "@/lib/push/reminders";
import { sendPushNotification } from "@/lib/push/web-push";
import type { Profile } from "@/types/database";

export const runtime = "nodejs";

type ReminderProfile = Pick<
  Profile,
  | "id"
  | "reminders_enabled"
  | "meal_reminder_time"
  | "supplement_reminder_time"
  | "gym_reminder_time"
  | "sleep_reminder_time"
  | "journal_reminder_time"
>;

function assertCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function isExpiredPushSubscription(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = "statusCode" in error ? Number(error.statusCode) : null;
  return statusCode === 404 || statusCode === 410;
}

export async function GET(request: Request) {
  if (!assertCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const [{ data: profiles, error: profilesError }, subscriptions] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, reminders_enabled, meal_reminder_time, supplement_reminder_time, gym_reminder_time, sleep_reminder_time, journal_reminder_time",
        )
        .eq("reminders_enabled", true)
        .returns<ReminderProfile[]>(),
      listAllPushSubscriptions(supabase),
    ]);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  let sent = 0;
  let skipped = 0;
  let deleted = 0;
  const failures: string[] = [];

  for (const subscription of subscriptions) {
    const profile = profilesById.get(subscription.user_id);
    if (!profile) {
      skipped += 1;
      continue;
    }

    const dueReminders = dueRemindersForSubscription({
      profile,
      subscription,
    });

    for (const reminder of dueReminders) {
      const claimed = await claimPushDelivery(supabase, {
        push_subscription_id: subscription.id,
        reminder_key: reminder.key,
        sent_for_date: reminder.sentForDate,
        user_id: subscription.user_id,
      });

      if (!claimed) {
        skipped += 1;
        continue;
      }

      try {
        await sendPushNotification(subscription, {
          body: reminder.body,
          tag: `errday-${reminder.key}-${reminder.sentForDate}`,
          title: reminder.title,
          url: reminder.url,
        });
        sent += 1;
      } catch (error) {
        if (isExpiredPushSubscription(error)) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          deleted += 1;
        } else {
          failures.push(subscription.id);
        }
      }
    }
  }

  return NextResponse.json({
    checkedSubscriptions: subscriptions.length,
    deleted,
    failures,
    sent,
    skipped,
  });
}
