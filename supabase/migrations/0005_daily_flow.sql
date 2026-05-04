do $$
begin
  if to_regclass('public.food_logs') is null then
    raise exception 'Missing public.food_logs. Apply supabase/migrations/0004_food_workout_tracking.sql before 0005_daily_flow.sql.';
  end if;

  if to_regclass('public.workout_logs') is null then
    raise exception 'Missing public.workout_logs. Apply supabase/migrations/0004_food_workout_tracking.sql before 0005_daily_flow.sql.';
  end if;
end;
$$;

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

alter table public.food_logs
add column if not exists meal_slot text null check (
  meal_slot is null or meal_slot in (
    'breakfast',
    'lunch',
    'dinner',
    'snack',
    'pre_workout',
    'post_workout'
  )
),
add column if not exists source text not null default 'manual',
add column if not exists external_food_id text null,
add column if not exists display_name text null;

alter table public.workout_logs
add column if not exists started_at timestamptz null,
add column if not exists ended_at timestamptz null,
add column if not exists plan_slot text null check (
  plan_slot is null or plan_slot = 'workout'
);

drop trigger if exists set_daily_profiles_updated_at on public.daily_profiles;

create trigger set_daily_profiles_updated_at
before update on public.daily_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_day_settings_updated_at on public.daily_day_settings;

create trigger set_daily_day_settings_updated_at
before update on public.daily_day_settings
for each row execute function public.set_updated_at();

alter table public.daily_profiles enable row level security;
alter table public.daily_day_settings enable row level security;
alter table public.water_logs enable row level security;

create policy "Daily profiles are selectable by owner"
on public.daily_profiles for select
to authenticated
using (user_id = auth.uid());

create policy "Daily profiles are insertable by owner"
on public.daily_profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "Daily profiles are updateable by owner"
on public.daily_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Daily profiles are deletable by owner"
on public.daily_profiles for delete
to authenticated
using (user_id = auth.uid());

create policy "Daily day settings are selectable by owner"
on public.daily_day_settings for select
to authenticated
using (user_id = auth.uid());

create policy "Daily day settings are insertable by owner"
on public.daily_day_settings for insert
to authenticated
with check (user_id = auth.uid());

create policy "Daily day settings are updateable by owner"
on public.daily_day_settings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Daily day settings are deletable by owner"
on public.daily_day_settings for delete
to authenticated
using (user_id = auth.uid());

create policy "Water logs are selectable by owner"
on public.water_logs for select
to authenticated
using (user_id = auth.uid());

create policy "Water logs are insertable by owner"
on public.water_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Water logs are updateable by owner"
on public.water_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Water logs are deletable by owner"
on public.water_logs for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.daily_profiles to authenticated;
grant select, insert, update, delete on public.daily_day_settings to authenticated;
grant select, insert, update, delete on public.water_logs to authenticated;
