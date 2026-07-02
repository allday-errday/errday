-- Apple Health sync: an iOS Shortcut posts daily metrics (steps, active
-- energy, sleep) to /api/health/ingest using a secret sync token, the same
-- pattern as the Apple Calendar feed.

create table if not exists public.health_sync_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) >= 32),
  created_at timestamptz not null default now()
);

create table if not exists public.health_daily_metrics (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps integer null check (steps >= 0 and steps <= 200000),
  active_energy_kcal numeric null check (active_energy_kcal >= 0 and active_energy_kcal <= 20000),
  exercise_minutes integer null check (exercise_minutes >= 0 and exercise_minutes <= 1440),
  sleep_hours numeric null check (sleep_hours >= 0 and sleep_hours <= 24),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.health_sync_tokens enable row level security;
alter table public.health_daily_metrics enable row level security;

drop policy if exists "owner_select" on public.health_sync_tokens;
drop policy if exists "owner_insert" on public.health_sync_tokens;
drop policy if exists "owner_update" on public.health_sync_tokens;
drop policy if exists "owner_delete" on public.health_sync_tokens;

drop policy if exists "owner_select" on public.health_daily_metrics;
drop policy if exists "owner_insert" on public.health_daily_metrics;
drop policy if exists "owner_update" on public.health_daily_metrics;
drop policy if exists "owner_delete" on public.health_daily_metrics;

create policy "owner_select" on public.health_sync_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "owner_insert" on public.health_sync_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy "owner_update" on public.health_sync_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_delete" on public.health_sync_tokens
  for delete to authenticated using (user_id = auth.uid());

create policy "owner_select" on public.health_daily_metrics
  for select to authenticated using (user_id = auth.uid());
create policy "owner_insert" on public.health_daily_metrics
  for insert to authenticated with check (user_id = auth.uid());
create policy "owner_update" on public.health_daily_metrics
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_delete" on public.health_daily_metrics
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.health_sync_tokens to authenticated;
grant select, insert, update, delete on public.health_daily_metrics to authenticated;

-- The Shortcut has no Supabase session, so ingest goes through this
-- security-definer function keyed by the secret token. Null fields keep
-- their previous value. Sleep also lands in sleep_logs, but never
-- overwrites a manually logged night.
create or replace function public.health_sync_ingest(
  sync_token text,
  metric_date date,
  steps_in integer default null,
  active_kcal_in numeric default null,
  exercise_minutes_in integer default null,
  sleep_hours_in numeric default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
begin
  select t.user_id into target_user
  from public.health_sync_tokens t
  where t.token = sync_token;

  if target_user is null then
    return false;
  end if;

  insert into public.health_daily_metrics
    (user_id, date, steps, active_energy_kcal, exercise_minutes, sleep_hours)
  values (
    target_user,
    metric_date,
    least(greatest(steps_in, 0), 200000),
    least(greatest(active_kcal_in, 0), 20000),
    least(greatest(exercise_minutes_in, 0), 1440),
    least(greatest(sleep_hours_in, 0), 24)
  )
  on conflict (user_id, date) do update set
    steps = coalesce(excluded.steps, health_daily_metrics.steps),
    active_energy_kcal = coalesce(excluded.active_energy_kcal, health_daily_metrics.active_energy_kcal),
    exercise_minutes = coalesce(excluded.exercise_minutes, health_daily_metrics.exercise_minutes),
    sleep_hours = coalesce(excluded.sleep_hours, health_daily_metrics.sleep_hours),
    updated_at = now();

  if sleep_hours_in is not null then
    insert into public.sleep_logs (user_id, date, sleep_hours, note)
    values (
      target_user,
      metric_date,
      least(greatest(sleep_hours_in, 0), 24),
      'Synced from Apple Health.'
    )
    on conflict (user_id, date) do nothing;
  end if;

  return true;
end;
$$;

revoke all on function public.health_sync_ingest(text, date, integer, numeric, integer, numeric) from public;
grant execute on function public.health_sync_ingest(text, date, integer, numeric, integer, numeric) to anon, authenticated;
