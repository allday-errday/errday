"use client";

type SerializedSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

function getPublicKey() {
  return process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
}

export function supportsPushNotifications() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(getPublicKey())
  );
}

export async function registerErrdayServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
}

export async function ensurePushSubscription() {
  if (!supportsPushNotifications()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  await registerErrdayServiceWorker();

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(getPublicKey() ?? ""),
      userVisibleOnly: true,
    }));

  await saveSubscription(subscription);
  return subscription;
}

export async function refreshExistingPushSubscription() {
  if (!supportsPushNotifications() || Notification.permission !== "granted") {
    return null;
  }

  await registerErrdayServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return null;
  }

  await saveSubscription(subscription);
  return subscription;
}

export async function removePushSubscription() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await fetch("/api/notifications/subscribe", {
    body: JSON.stringify({ endpoint: subscription.endpoint }),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });

  await subscription.unsubscribe();
}

export async function sendTestPushNotification() {
  const response = await fetch("/api/notifications/test", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ sent: number }>;
}

async function saveSubscription(subscription: PushSubscription) {
  const serialized = subscription.toJSON() as SerializedSubscription;

  const response = await fetch("/api/notifications/subscribe", {
    body: JSON.stringify({
      ...serialized,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
