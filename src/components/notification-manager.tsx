"use client";

import { useEffect } from "react";
import {
  refreshExistingPushSubscription,
  registerErrdayServiceWorker,
} from "@/lib/push/client";

export function NotificationManager() {
  useEffect(() => {
    let active = true;

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
