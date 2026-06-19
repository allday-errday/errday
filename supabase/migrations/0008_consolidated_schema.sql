-- ============================================================================
-- ERRDAY — consolidated, idempotent schema.
-- Safe to run once on ANY database state. It only adds what is missing:
--   * create table / column / index "if not exists"
--   * drop-then-create for policies and triggers
--   * seeds guarded so they never duplicate
-- This reconciles migrations 0001–0007 into a single source of truth.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- TABLES (creation order respects foreign keys)
-- ===========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  sex text null check (sex in ('male', 'female')),
  birthdate date null,
  height_cm numeric null check (height_cm > 0),
  current_weight_kg numeric null check (current_weight_kg > 0),
  goal text null check (goal in ('lose', 'maintain', 'gain')),
  target_weight_kg numeric null check (target_weight_kg > 0),
  target_rate_kg_per_week numeric null,
  activity_level text null check (activity_level in ('sedentary', 'light', 'moderate', 'very_active', 'athlete')),
  calorie_target integer null,
  protein_target_g integer null,
  carbs_target_g integer null,
  fat_target_g integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- reminder settings (was 0004_profile_reminder_settings)
alter table public.profiles
  add column if not exists reminders_enabled boolean null default false,
  add column if not exists meal_reminder_time time null,
  add column if not exists supplement_reminder_time time null,
  add column if not exists gym_reminder_time time null,
  add column if not exists gym_rest_end_reminder_enabled boolean null default false,
  add column if not exists sleep_reminder_time time null,
  add column if not exists journal_reminder_time time null;

create table if not exists public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  note text null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  amount text null,
  calories integer not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours numeric not null check (sleep_hours >= 0 and sleep_hours <= 24),
  quality integer null check (quality >= 1 and quality <= 5),
  bedtime time null,
  wake_time time null,
  note text null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood integer null check (mood >= 1 and mood <= 5),
  energy integer null check (energy >= 1 and energy <= 5),
  stress integer null check (stress >= 1 and stress <= 5),
  content text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date, name)
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text not null default 'bodyweight',
  category text not null default 'strength',
  instructions text null,
  image_key text null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid null references public.exercises(id) on delete set null,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  reps integer null check (reps >= 0),
  weight_kg numeric null check (weight_kg >= 0),
  rpe numeric null check (rpe >= 0 and rpe <= 10),
  note text null,
  created_at timestamptz not null default now()
);
alter table public.workout_sets
  add column if not exists exercise_id uuid null references public.exercises(id) on delete set null;

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  image_url text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  program_id uuid null references public.workout_programs(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  description text null,
  category text not null default 'strength',
  image_url text null,
  estimated_minutes integer not null default 45 check (estimated_minutes > 0),
  estimated_calories integer null check (estimated_calories >= 0),
  created_at timestamptz not null default now()
);
-- patch existing installs to the final shape
alter table public.workout_templates alter column user_id drop not null;
alter table public.workout_templates
  add column if not exists category text not null default 'strength',
  add column if not exists image_url text null,
  add column if not exists estimated_minutes integer not null default 45,
  add column if not exists estimated_calories integer null,
  add column if not exists program_id uuid null references public.workout_programs(id) on delete cascade,
  add column if not exists position integer not null default 0;

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 3,
  target_reps text null,
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.active_workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid null references public.workouts(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 4,
  target_reps text null,
  note text null,
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_id)
);

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  name text not null,
  brand text null,
  calories_per_serving integer not null check (calories_per_serving >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  serving_label text not null default '1 serving',
  image_url text null,
  barcode text null,
  external_source text null,
  external_id text null,
  serving_size text null,
  created_at timestamptz not null default now()
);
alter table public.food_items
  add column if not exists image_url text null,
  add column if not exists barcode text null,
  add column if not exists external_source text null,
  add column if not exists external_id text null,
  add column if not exists serving_size text null;

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete restrict,
  logged_at timestamptz not null default now(),
  servings numeric not null default 1 check (servings > 0),
  calories integer not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  meal_slot text null,
  source text not null default 'manual',
  external_food_id text null,
  display_name text null,
  created_at timestamptz not null default now()
);
alter table public.food_logs
  add column if not exists meal_slot text null,
  add column if not exists source text not null default 'manual',
  add column if not exists external_food_id text null,
  add column if not exists display_name text null;

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_template_id uuid null references public.workout_templates(id) on delete set null,
  name text not null,
  category text not null default 'strength',
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  calories_burned integer not null default 0 check (calories_burned >= 0),
  logged_at timestamptz not null default now(),
  started_at timestamptz null,
  ended_at timestamptz null,
  plan_slot text null,
  notes text null,
  created_at timestamptz not null default now()
);
alter table public.workout_logs
  add column if not exists started_at timestamptz null,
  add column if not exists ended_at timestamptz null,
  add column if not exists plan_slot text null;

create table if not exists public.nutrition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text null check (sex in ('male', 'female')),
  birthdate date null,
  height_cm numeric null check (height_cm > 0),
  weight_kg numeric null check (weight_kg > 0),
  activity_level text null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active', 'athlete')),
  goal text null check (goal in ('lose', 'maintain', 'gain')),
  daily_calorie_target integer null check (daily_calorie_target > 0),
  daily_protein_target_g integer null check (daily_protein_target_g > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_day_type text not null default 'rest' check (default_day_type in ('rest', 'gym')),
  sleep_goal_hours numeric not null default 8 check (sleep_goal_hours > 0 and sleep_goal_hours <= 24),
  water_goal_ml integer not null default 2500 check (water_goal_ml > 0),
  suggested_bedtime time not null default '22:30',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_day_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  day_type text not null default 'rest' check (day_type in ('rest', 'gym')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
create unique index if not exists exercises_global_slug_key
  on public.exercises (slug) where user_id is null;
create unique index if not exists exercises_user_slug_key
  on public.exercises (user_id, slug) where user_id is not null;
create unique index if not exists food_items_user_external_source_id_key
  on public.food_items (user_id, external_source, external_id)
  where user_id is not null and external_source is not null and external_id is not null;
create index if not exists workout_templates_program_id_idx
  on public.workout_templates (program_id);

-- ===========================================================================
-- TRIGGERS (drop-then-create for idempotency)
-- ===========================================================================
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_journal_entries_updated_at on public.journal_entries;
create trigger set_journal_entries_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists set_nutrition_targets_updated_at on public.nutrition_targets;
create trigger set_nutrition_targets_updated_at before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

drop trigger if exists set_daily_profiles_updated_at on public.daily_profiles;
create trigger set_daily_profiles_updated_at before update on public.daily_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_daily_day_settings_updated_at on public.daily_day_settings;
create trigger set_daily_day_settings_updated_at before update on public.daily_day_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_workout_programs_updated_at on public.workout_programs;
create trigger set_workout_programs_updated_at before update on public.workout_programs
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- ROW LEVEL SECURITY + POLICIES
-- Step 1: enable RLS and clear ALL pre-existing policies on managed tables
--         (so old descriptive-named policies don't linger as duplicates).
-- Step 2: create one canonical policy set.
-- ===========================================================================
do $$
declare
  managed text[] := array[
    'profiles', 'body_weight_logs', 'food_entries', 'sleep_logs', 'journal_entries',
    'workouts', 'workout_sets', 'habit_logs', 'exercises', 'workout_programs',
    'workout_templates', 'workout_template_exercises', 'active_workout_sessions',
    'workout_exercises', 'food_items', 'food_logs', 'workout_logs', 'nutrition_targets',
    'daily_profiles', 'daily_day_settings', 'water_logs'
  ];
  t text;
  pol text;
begin
  foreach t in array managed loop
    execute format('alter table public.%I enable row level security', t);
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol, t);
    end loop;
  end loop;
end $$;

-- Simple owner CRUD via a user_id column
do $$
declare
  owner_tables text[] := array[
    'body_weight_logs', 'food_entries', 'sleep_logs', 'journal_entries',
    'workouts', 'workout_sets', 'habit_logs', 'active_workout_sessions',
    'workout_exercises', 'food_logs', 'workout_logs',
    'daily_profiles', 'daily_day_settings', 'water_logs', 'workout_programs'
  ];
  t text;
begin
  foreach t in array owner_tables loop
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- profiles: owned by id (not user_id)
create policy "owner_select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "owner_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "owner_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "owner_delete" on public.profiles for delete to authenticated using (id = auth.uid());

-- nutrition_targets: owned by user_id (select/insert/update only)
create policy "owner_select" on public.nutrition_targets for select to authenticated using (user_id = auth.uid());
create policy "owner_insert" on public.nutrition_targets for insert to authenticated with check (user_id = auth.uid());
create policy "owner_update" on public.nutrition_targets for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercises: global rows (user_id null) readable; only custom rows writable by owner
create policy "exercises_select" on public.exercises for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "exercises_insert" on public.exercises for insert to authenticated with check (user_id = auth.uid() and is_custom = true);
create policy "exercises_update" on public.exercises for update to authenticated using (user_id = auth.uid() and is_custom = true) with check (user_id = auth.uid() and is_custom = true);
create policy "exercises_delete" on public.exercises for delete to authenticated using (user_id = auth.uid() and is_custom = true);

-- food_items: global readable, owner writable
create policy "food_items_select" on public.food_items for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "food_items_insert" on public.food_items for insert to authenticated with check (user_id = auth.uid());
create policy "food_items_update" on public.food_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "food_items_delete" on public.food_items for delete to authenticated using (user_id = auth.uid());

-- workout_templates: global readable, owner writable
create policy "templates_select" on public.workout_templates for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "templates_insert" on public.workout_templates for insert to authenticated with check (user_id = auth.uid());
create policy "templates_update" on public.workout_templates for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "templates_delete" on public.workout_templates for delete to authenticated using (user_id = auth.uid());

-- workout_template_exercises: access gated through owning template
create policy "wte_select" on public.workout_template_exercises for select to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "wte_insert" on public.workout_template_exercises for insert to authenticated
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "wte_update" on public.workout_template_exercises for update to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "wte_delete" on public.workout_template_exercises for delete to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));

-- ===========================================================================
-- GRANTS
-- ===========================================================================
grant usage on schema public to authenticated;
do $$
declare
  all_tables text[] := array[
    'profiles', 'body_weight_logs', 'food_entries', 'sleep_logs',
    'journal_entries', 'workouts', 'workout_sets', 'habit_logs',
    'exercises', 'workout_programs', 'workout_templates',
    'workout_template_exercises', 'active_workout_sessions', 'workout_exercises',
    'food_items', 'food_logs', 'workout_logs', 'nutrition_targets',
    'daily_profiles', 'daily_day_settings', 'water_logs'
  ];
  t text;
begin
  foreach t in array all_tables loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ===========================================================================
-- SEEDS (guarded so re-running never duplicates)
-- ===========================================================================

-- Global exercises (unique slug => on conflict is safe)
insert into public.exercises
  (user_id, name, slug, primary_muscle, secondary_muscles, equipment, category, instructions, image_key, is_custom)
values
  (null, 'Bench Press', 'bench-press', 'Chest', array['Triceps', 'Shoulders'], 'barbell', 'strength', 'Lie on the bench, lower the bar under control, and press it back up with a stable upper back.', 'bench-press', false),
  (null, 'Incline Bench Press', 'incline-bench-press', 'Chest', array['Triceps', 'Shoulders'], 'barbell', 'strength', 'Set the bench on an incline and press the bar while keeping elbows controlled.', 'incline-bench-press', false),
  (null, 'Dumbbell Bench Press', 'dumbbell-bench-press', 'Chest', array['Triceps', 'Shoulders'], 'dumbbell', 'strength', 'Press dumbbells from chest level while keeping wrists stacked and shoulder blades set.', 'dumbbell-bench-press', false),
  (null, 'Incline Dumbbell Press', 'incline-dumbbell-press', 'Chest', array['Triceps', 'Shoulders'], 'dumbbell', 'strength', 'Press dumbbells on an incline bench with a controlled lower and strong lockout.', 'incline-dumbbell-press', false),
  (null, 'Chest Press Machine', 'chest-press-machine', 'Chest', array['Triceps', 'Shoulders'], 'machine', 'strength', 'Adjust the seat, press handles forward, and return with control.', 'chest-press-machine', false),
  (null, 'Cable Fly', 'cable-fly', 'Chest', array['Shoulders'], 'cable', 'strength', 'Bring cable handles together in an arc while keeping a soft bend in the elbows.', 'cable-fly', false),
  (null, 'Push-Up', 'push-up', 'Chest', array['Triceps', 'Shoulders', 'Core'], 'bodyweight', 'strength', 'Keep a straight body line, lower to the floor, and press back up.', 'push-up', false),
  (null, 'Pull-Up', 'pull-up', 'Back', array['Biceps'], 'bodyweight', 'strength', 'Pull your chest toward the bar, then lower under control.', 'pull-up', false),
  (null, 'Lat Pulldown', 'lat-pulldown', 'Back', array['Biceps'], 'cable', 'strength', 'Pull the bar toward the upper chest while driving elbows down.', 'lat-pulldown', false),
  (null, 'Barbell Row', 'barbell-row', 'Back', array['Biceps', 'Rear Delts'], 'barbell', 'strength', 'Hinge at the hips and row the bar toward your torso.', 'barbell-row', false),
  (null, 'Seated Cable Row', 'seated-cable-row', 'Back', array['Biceps', 'Rear Delts'], 'cable', 'strength', 'Row the handle toward your torso while keeping the chest tall.', 'seated-cable-row', false),
  (null, 'Dumbbell Row', 'dumbbell-row', 'Back', array['Biceps', 'Rear Delts'], 'dumbbell', 'strength', 'Support your body and row the dumbbell toward your hip.', 'dumbbell-row', false),
  (null, 'Deadlift', 'deadlift', 'Back', array['Hamstrings', 'Glutes', 'Core'], 'barbell', 'strength', 'Brace, push through the floor, and stand tall with the bar close.', 'deadlift', false),
  (null, 'Shoulder Press', 'shoulder-press', 'Shoulders', array['Triceps'], 'barbell', 'strength', 'Press the bar overhead while keeping ribs down and core braced.', 'shoulder-press', false),
  (null, 'Dumbbell Shoulder Press', 'dumbbell-shoulder-press', 'Shoulders', array['Triceps'], 'dumbbell', 'strength', 'Press dumbbells overhead from shoulder height with control.', 'dumbbell-shoulder-press', false),
  (null, 'Lateral Raise', 'lateral-raise', 'Shoulders', array[]::text[], 'dumbbell', 'strength', 'Raise dumbbells out to the sides to shoulder height with soft elbows.', 'lateral-raise', false),
  (null, 'Rear Delt Fly', 'rear-delt-fly', 'Shoulders', array['Upper Back'], 'dumbbell', 'strength', 'Hinge forward and raise weights out wide to target rear delts.', 'rear-delt-fly', false),
  (null, 'Face Pull', 'face-pull', 'Shoulders', array['Upper Back'], 'cable', 'strength', 'Pull the rope toward your face with elbows high and shoulder blades moving.', 'face-pull', false),
  (null, 'Biceps Curl', 'biceps-curl', 'Arms', array['Biceps'], 'dumbbell', 'strength', 'Curl the weight up without swinging, then lower fully.', 'biceps-curl', false),
  (null, 'Hammer Curl', 'hammer-curl', 'Arms', array['Biceps', 'Forearms'], 'dumbbell', 'strength', 'Curl with neutral wrists and controlled elbows.', 'hammer-curl', false),
  (null, 'Triceps Pushdown', 'triceps-pushdown', 'Arms', array['Triceps'], 'cable', 'strength', 'Push the cable down until elbows are extended, then return with control.', 'triceps-pushdown', false),
  (null, 'Overhead Triceps Extension', 'overhead-triceps-extension', 'Arms', array['Triceps'], 'dumbbell', 'strength', 'Lower the weight behind your head and extend elbows overhead.', 'overhead-triceps-extension', false),
  (null, 'Skull Crusher', 'skull-crusher', 'Arms', array['Triceps'], 'barbell', 'strength', 'Lower the bar toward your forehead and extend elbows without flaring.', 'skull-crusher', false),
  (null, 'Squat', 'squat', 'Legs', array['Glutes', 'Core'], 'barbell', 'strength', 'Brace, sit between your hips, and drive back up through the floor.', 'squat', false),
  (null, 'Leg Press', 'leg-press', 'Legs', array['Glutes'], 'machine', 'strength', 'Lower the sled with control and press through the platform.', 'leg-press', false),
  (null, 'Romanian Deadlift', 'romanian-deadlift', 'Legs', array['Hamstrings', 'Glutes'], 'barbell', 'strength', 'Hinge at the hips, keep the bar close, and feel the hamstrings load.', 'romanian-deadlift', false),
  (null, 'Leg Curl', 'leg-curl', 'Legs', array['Hamstrings'], 'machine', 'strength', 'Curl the pad toward you and return slowly.', 'leg-curl', false),
  (null, 'Leg Extension', 'leg-extension', 'Legs', array['Quads'], 'machine', 'strength', 'Extend knees to lift the pad, then lower with control.', 'leg-extension', false),
  (null, 'Calf Raise', 'calf-raise', 'Legs', array['Calves'], 'machine', 'strength', 'Rise onto the balls of your feet and lower through a full range.', 'calf-raise', false),
  (null, 'Bulgarian Split Squat', 'bulgarian-split-squat', 'Legs', array['Glutes', 'Quads'], 'dumbbell', 'strength', 'Place one foot behind you and squat the front leg with control.', 'bulgarian-split-squat', false),
  (null, 'Hip Thrust', 'hip-thrust', 'Legs', array['Glutes', 'Hamstrings'], 'barbell', 'strength', 'Drive hips up from a bench setup and squeeze glutes at the top.', 'hip-thrust', false),
  (null, 'Plank', 'plank', 'Core', array['Abs'], 'bodyweight', 'strength', 'Hold a straight body line while bracing your core.', 'plank', false),
  (null, 'Hanging Leg Raise', 'hanging-leg-raise', 'Core', array['Hip Flexors'], 'bodyweight', 'strength', 'Hang from a bar and raise legs with controlled core tension.', 'hanging-leg-raise', false),
  (null, 'Cable Crunch', 'cable-crunch', 'Core', array['Abs'], 'cable', 'strength', 'Crunch down against the cable while keeping hips steady.', 'cable-crunch', false),
  (null, 'Ab Wheel Rollout', 'ab-wheel-rollout', 'Core', array['Abs', 'Shoulders'], 'bodyweight', 'strength', 'Roll forward under control and pull back using your core.', 'ab-wheel-rollout', false)
on conflict do nothing;

-- Global food items (no unique key => guard against duplicates)
do $$
begin
  if not exists (select 1 from public.food_items where user_id is null) then
    insert into public.food_items
      (user_id, name, brand, calories_per_serving, protein_g, carbs_g, fat_g, serving_label, image_url)
    values
      (null, 'Greek Yogurt Bowl', 'Errday Base', 220, 24, 18, 4, '1 bowl', null),
      (null, 'Chicken Rice Bowl', 'Errday Base', 640, 48, 72, 14, '1 bowl', null),
      (null, 'Protein Shake', 'Errday Base', 180, 32, 6, 3, '1 shake', null),
      (null, 'Oats with Banana', 'Errday Base', 410, 16, 70, 9, '1 bowl', null),
      (null, 'Salmon Plate', 'Errday Base', 590, 42, 38, 28, '1 plate', null),
      (null, 'Eggs and Toast', 'Errday Base', 460, 26, 36, 24, '1 plate', null),
      (null, 'Tuna Wrap', 'Errday Base', 390, 34, 42, 10, '1 wrap', null),
      (null, 'Lean Beef Pasta', 'Errday Base', 720, 52, 82, 18, '1 bowl', null),
      (null, 'Cottage Cheese', 'Errday Base', 160, 26, 8, 3, '200 g', null),
      (null, 'Avocado Toast', 'Errday Base', 340, 11, 36, 18, '2 slices', null);
  end if;
end $$;

-- Global workout templates (no unique key => guard against duplicates)
do $$
begin
  if not exists (select 1 from public.workout_templates where user_id is null) then
    insert into public.workout_templates
      (user_id, name, category, description, image_url, estimated_minutes, estimated_calories)
    values
      (null, 'Push Day', 'push', 'Chest, shoulders and triceps strength session.', null, 60, 420),
      (null, 'Pull Day', 'pull', 'Back, rear delts and biceps.', null, 60, 430),
      (null, 'Leg Day', 'legs', 'Quads, hamstrings, glutes and calves.', null, 55, 500),
      (null, 'Upper Body', 'upper', 'Balanced upper-body hypertrophy.', null, 65, 460),
      (null, 'Lower Body', 'lower', 'Squat and hinge focused lower session.', null, 55, 480),
      (null, 'Full Body', 'full_body', 'Efficient all-round strength day.', null, 50, 440),
      (null, 'Core Circuit', 'core', 'Abs, bracing and trunk control.', null, 25, 180),
      (null, 'Zone 2 Cardio', 'cardio', 'Low-intensity steady cardio.', null, 40, 320),
      (null, 'HIIT Conditioning', 'conditioning', 'Short, hard conditioning intervals.', null, 25, 300),
      (null, 'Mobility Reset', 'mobility', 'Light mobility and recovery work.', null, 20, 90);
  end if;
end $$;
