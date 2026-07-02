-- Calendar system: events, per-user ICS feed tokens, and a secure feed function
-- for the Apple Calendar subscription (webcal).

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text null,
  location text null,
  date date not null,
  start_time time null,
  end_time time null,
  category text not null default 'general'
    check (category in ('workout', 'meal', 'sleep', 'reminder', 'general')),
  reminder_minutes integer null check (reminder_minutes >= 0 and reminder_minutes <= 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_user_date_idx
  on public.calendar_events (user_id, date);

create table if not exists public.calendar_feed_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) >= 32),
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;
alter table public.calendar_feed_tokens enable row level security;

drop policy if exists "owner_select" on public.calendar_events;
drop policy if exists "owner_insert" on public.calendar_events;
drop policy if exists "owner_update" on public.calendar_events;
drop policy if exists "owner_delete" on public.calendar_events;

drop policy if exists "owner_select" on public.calendar_feed_tokens;
drop policy if exists "owner_insert" on public.calendar_feed_tokens;
drop policy if exists "owner_update" on public.calendar_feed_tokens;
drop policy if exists "owner_delete" on public.calendar_feed_tokens;

create policy "owner_select" on public.calendar_events
  for select to authenticated using (user_id = auth.uid());
create policy "owner_insert" on public.calendar_events
  for insert to authenticated with check (user_id = auth.uid());
create policy "owner_update" on public.calendar_events
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_delete" on public.calendar_events
  for delete to authenticated using (user_id = auth.uid());

create policy "owner_select" on public.calendar_feed_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "owner_insert" on public.calendar_feed_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy "owner_update" on public.calendar_feed_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_delete" on public.calendar_feed_tokens
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.calendar_feed_tokens to authenticated;

-- Apple Calendar fetches the ICS feed without a session, so the feed route
-- resolves events through this security-definer function using the secret token.
create or replace function public.calendar_feed_events(feed_token text)
returns setof public.calendar_events
language sql
security definer
set search_path = public
stable
as $$
  select e.*
  from public.calendar_events e
  join public.calendar_feed_tokens t on t.user_id = e.user_id
  where t.token = feed_token
    and e.date >= (current_date - interval '60 days')
  order by e.date, e.start_time nulls first;
$$;

revoke all on function public.calendar_feed_events(text) from public;
grant execute on function public.calendar_feed_events(text) to anon, authenticated;
