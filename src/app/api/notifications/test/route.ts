import { NextResponse } from "next/server";
import { listPushSubscriptions } from "@/lib/db/push-subscriptions";
import { sendPushNotification } from "@/lib/push/web-push";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const { supabase, user } = await requireUser();
  const subscriptions = await listPushSubscriptions(supabase, user.id);

  if (subscriptions.length === 0) {
    return new Response("No push subscription for this device.", { status: 404 });
  }

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      await sendPushNotification(subscription, {
        body: "Your iPhone push path is connected.",
        tag: "errday-test",
        title: "Errday notifications are on",
        url: "/today",
      });
      sent += 1;
    }),
  );

  return NextResponse.json({ sent });
}
