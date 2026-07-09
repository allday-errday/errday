"use client";

import { useEffect } from "react";
import {
  refreshExistingPushSubscription,
  registerErrdayServiceWorker,
} from "@/lib/push/client";
import { installNativeReminderClickHandler } from "@/lib/native/local-reminders";

export function NotificationManager() {
  useEffect(() => {
    let active = true;

    installNativeReminderClickHandler().catch(console.error);

    registerErrdayServiceWorker()
      .then(() => {
        if (!active) {
          return null;
        }

        return refreshExistingPushSubscription();
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  return null;
}
