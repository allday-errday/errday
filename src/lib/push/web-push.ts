import webPush from "web-push";
import { getWebPushConfig } from "@/lib/push/config";
import { isAllowedPushEndpoint } from "@/lib/push/endpoints";
import type { PushSubscriptionRecord } from "@/types/database";

export type PushPayload = {
  body: string;
  tag?: string;
  title: string;
  url?: string;
};

export function configureWebPush() {
  const config = getWebPushConfig();

  if (!config.publicKey || !config.privateKey) {
    throw new Error("Missing Web Push VAPID keys.");
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return webPush;
}

export async function sendPushNotification(
  subscription: Pick<PushSubscriptionRecord, "auth" | "endpoint" | "p256dh">,
  payload: PushPayload,
) {
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    throw new Error("Unsupported push endpoint.");
  }

  const push = configureWebPush();

  return push.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.auth,
        p256dh: subscription.p256dh,
      },
    },
    JSON.stringify(payload),
  );
}
