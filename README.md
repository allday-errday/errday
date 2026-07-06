# Errday

All day. Errday.

Errday is a private personal all-day tracker for fitness, nutrition, sleep, journaling, body weight tracking and daily habits.

## Core moduless

- Today dashboard
- Gym tracker
- Food and calories
- Sleep tracking
- Journal
- Body weight and progress
- Future integrations: Strava, Apple Health, Health Connect

## Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- PWA-first mobile experience

## Current scope

This version supports Supabase email/password authentication and manual tracking only.

Gym v1 includes:

- Exercise library with seeded global exercises
- Custom exercise creation
- Empty workout starts
- Workout builder with exercise selection
- Active workout screen with timer, exercise rows and set entry
- Add exercises during an active workout
- Workout history with sets, exercises and estimated volume
- Basic workout templates list and creation

Not included yet:

- External nutrition APIs
- Barcode scanning
- Strava
- Apple Health
- Health Connect

## Supabase setup

Create a Supabase project:

- Project name: `errday`
- Region: Central Europe Zurich

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the Supabase publishable/anon key only. Never put `service_role` or other secret keys in frontend environment variables.

## Database migration

The initial schema lives at:

```text
supabase/migrations/0001_initial_schema.sql
```

To apply it manually:

1. Open the Supabase dashboard.
2. Go to SQL Editor.
3. Paste the full contents of `supabase/migrations/0001_initial_schema.sql`.
4. Run the query.

The migration creates tables for profiles, body weight, food, sleep, journal, workouts, workout sets and habits. Row Level Security is enabled so authenticated users can only access their own rows.

If you already applied `0001_initial_schema.sql` before the authenticated table grants were added, also run:

```text
supabase/migrations/0002_authenticated_grants.sql
```

For the Gym v1 exercise library, workout templates and active workout sessions, run:

```text
supabase/migrations/0003_gym_exercise_library.sql
```

For Food/Gym database-backed tracking, seeded food items, global workout
templates, workout logs and nutrition targets, run:

```text
supabase/migrations/0004_food_workout_tracking.sql
```

For the calendar (events, AI coach calendar tools and the Apple Calendar feed), run:

```text
supabase/migrations/0009_calendar.sql
```

Apply migrations manually in order through the Supabase SQL Editor. Copy the full SQL file contents, paste into a new SQL Editor query, and run it.

## Apple Calendar sync

Errday publishes a private ICS feed that the iPhone Calendar app can subscribe to.

1. Open Settings in Errday and enable the Apple Calendar feed. This creates a secret feed link (rotate or disable it anytime).
2. On the iPhone: Settings → Apps → Calendar → Calendar Accounts → Add Account → Other → Add Subscribed Calendar, then paste the link.
3. Events with a reminder include native alarms, so the phone rings without Errday being open.

The phone must be able to reach the app's address, so deploy Errday (or use a tunnel) — a feed served only on `localhost` is not reachable from the phone. Apple refreshes subscribed calendars periodically.

## iPhone app and push notifications

See `docs/ios-mobile-testing.md` for the Home Screen app install flow, Web Push setup, Vercel cron reminders and the Capacitor iOS wrapper.

## AI coach calendar actions

With a tool-capable Ollama model (for example `qwen3:4b` or `llama3.1:8b`, set via `OLLAMA_MODEL`), the coach can add, list and delete calendar events in chat ("Schedule leg day tomorrow at 18:00 with a reminder"). With models that cannot use tools (like `gemma3`), the coach still chats but calendar actions are disabled automatically.

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000/today
```

Quality checks:

```bash
npm run lint
npm run build
```

<!-- Deployed on Vercel -->
