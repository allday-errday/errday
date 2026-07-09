# Errday on iPhone

## Safari Home Screen app with web push

This is the practical iPhone test path for the current Next.js app.

1. Apply the Supabase migrations through the latest timestamped migration.
2. Generate VAPID keys:

   ```bash
   npm run push:keys
   ```

3. Set these environment variables in Vercel:

   ```text
   NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=
   WEB_PUSH_PRIVATE_KEY=
   WEB_PUSH_SUBJECT=mailto:you@example.com
   SUPABASE_SERVICE_ROLE_KEY=
   CRON_SECRET=
   ```

4. Deploy the app to HTTPS.
5. On iPhone, open the deployed URL in Safari.
6. Use Share -> Add to Home Screen.
7. Open Errday from the Home Screen icon, sign in, go to Settings, save reminder times, tap Enable under iPhone push, then tap Test.

The cron route is `/api/notifications/reminders` and is configured in `vercel.json` for every 15 minutes. Vercel calls it with `Authorization: Bearer $CRON_SECRET`.

## Native iOS wrapper

Capacitor is configured for a native iOS shell in `ios/App`. It loads the deployed app URL from `CAPACITOR_SERVER_URL`, defaulting to `https://errday.ch`.

On a Mac with Xcode:

```bash
npm install
export CAPACITOR_SERVER_URL=https://errday.ch
npm run ios:sync
npm run ios:open
```

Then select an Apple development team in Xcode for both targets:

- `App`
- `ErrdayWidgetExtension`

Enable or confirm these capabilities in Xcode:

- HealthKit for `App`
- App Groups with `group.com.errday.app` for `App` and `ErrdayWidgetExtension`

Run on your iPhone or upload to TestFlight.

## Native reminders

The Xcode app uses `@capacitor/local-notifications` for daily reminders. In Settings:

1. Turn on daily reminders.
2. Set the times.
3. Save reminders.
4. If running inside the native app, Errday also schedules local iPhone reminders.

Safari Home Screen installs still use web push and the Vercel cron.

## Apple Health

The native iOS app includes a Capacitor HealthKit bridge. In Settings -> Apple Health:

1. Enable Apple Health sync to generate a private sync key.
2. In the native app, tap Sync today.
3. iOS asks for Health permissions for steps, active energy, exercise minutes and sleep.
4. Errday posts the metrics to `/api/health/ingest` with the private sync key.

The existing Shortcut-based sync remains useful for Safari/PWA installs or scheduled morning syncs.

## Widgets

`ErrdayWidgetExtension` adds a native WidgetKit target with an `Errday Today` widget. The first version is a quick-launch widget that opens the native app through the `errday://today` URL scheme. Data-rich widgets can be added later by writing a compact daily summary into the configured App Group.

Important: iOS Web Push works for Safari-installed Home Screen apps. A Capacitor `WKWebView` should use native local notifications or APNs/Capacitor Push Notifications for closed-app delivery.
