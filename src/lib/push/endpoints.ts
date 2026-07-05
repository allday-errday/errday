export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      (host === "web.push.apple.com" ||
        host.endsWith(".push.apple.com") ||
        host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
