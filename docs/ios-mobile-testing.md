# Errday on iPhone

## Home Screen app with push notifications

This is the practical iPhone test path for the current Next.js app.

1. Apply `supabase/migrations/0013_push_notifications.sql`.
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

Then select an Apple development team in Xcode and run on your iPhone or upload to TestFlight.

Important: iOS Web Push works for Safari-installed Home Screen apps. A Capacitor `WKWebView` needs native APNs/Capacitor Push Notifications setup for closed-app push delivery.
