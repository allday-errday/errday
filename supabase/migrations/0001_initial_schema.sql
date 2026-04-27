create extension if not exists pgcrypto;

create table public.profiles (
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

create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  note text null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.food_entries (
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

create table public.sleep_logs (
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

create table public.journal_entries (
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

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  note text null,
  created_at timestamptz not null default now()
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  reps integer null check (reps >= 0),
  weight_kg numeric null check (weight_kg >= 0),
  rpe numeric null check (rpe >= 0 and rpe <= 10),
  note text null,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date, name)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_journal_entries_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.body_weight_logs enable row level security;
alter table public.food_entries enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.habit_logs enable row level security;

create policy "Profiles are selectable by owner"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Profiles are insertable by owner"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Profiles are updateable by owner"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Profiles are deletable by owner"
on public.profiles for delete
to authenticated
using (id = auth.uid());

create policy "Body weight logs are selectable by owner"
on public.body_weight_logs for select
to authenticated
using (user_id = auth.uid());

create policy "Body weight logs are insertable by owner"
on public.body_weight_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Body weight logs are updateable by owner"
on public.body_weight_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Body weight logs are deletable by owner"
on public.body_weight_logs for delete
to authenticated
using (user_id = auth.uid());

create policy "Food entries are selectable by owner"
on public.food_entries for select
to authenticated
using (user_id = auth.uid());

create policy "Food entries are insertable by owner"
on public.food_entries for insert
to authenticated
with check (user_id = auth.uid());

create policy "Food entries are updateable by owner"
on public.food_entries for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Food entries are deletable by owner"
on public.food_entries for delete
to authenticated
using (user_id = auth.uid());

create policy "Sleep logs are selectable by owner"
on public.sleep_logs for select
to authenticated
using (user_id = auth.uid());

create policy "Sleep logs are insertable by owner"
on public.sleep_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Sleep logs are updateable by owner"
on public.sleep_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Sleep logs are deletable by owner"
on public.sleep_logs for delete
to authenticated
using (user_id = auth.uid());

create policy "Journal entries are selectable by owner"
on public.journal_entries for select
to authenticated
using (user_id = auth.uid());

create policy "Journal entries are insertable by owner"
on public.journal_entries for insert
to authenticated
with check (user_id = auth.uid());

create policy "Journal entries are updateable by owner"
on public.journal_entries for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Journal entries are deletable by owner"
on public.journal_entries for delete
to authenticated
using (user_id = auth.uid());

create policy "Workouts are selectable by owner"
on public.workouts for select
to authenticated
using (user_id = auth.uid());

create policy "Workouts are insertable by owner"
on public.workouts for insert
to authenticated
with check (user_id = auth.uid());

create policy "Workouts are updateable by owner"
on public.workouts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workouts are deletable by owner"
on public.workouts for delete
to authenticated
using (user_id = auth.uid());

create policy "Workout sets are selectable by owner"
on public.workout_sets for select
to authenticated
using (user_id = auth.uid());

create policy "Workout sets are insertable by owner"
on public.workout_sets for insert
to authenticated
with check (user_id = auth.uid());

create policy "Workout sets are updateable by owner"
on public.workout_sets for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workout sets are deletable by owner"
on public.workout_sets for delete
to authenticated
using (user_id = auth.uid());

create policy "Habit logs are selectable by owner"
on public.habit_logs for select
to authenticated
using (user_id = auth.uid());

create policy "Habit logs are insertable by owner"
on public.habit_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Habit logs are updateable by owner"
on public.habit_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Habit logs are deletable by owner"
on public.habit_logs for delete
to authenticated
using (user_id = auth.uid());

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.body_weight_logs to authenticated;
grant select, insert, update, delete on public.food_entries to authenticated;
grant select, insert, update, delete on public.sleep_logs to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;
