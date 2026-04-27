# Errday

All day. Errday.

Errday is a private personal all-day tracker for fitness, nutrition, sleep, journaling, body weight tracking and daily habits.

## Core modules

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
