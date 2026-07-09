-- Web Push subscriptions for installed Errday mobile/PWA clients.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  timezone text null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_https check (endpoint like 'https://%'),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions are readable by owner" on public.push_subscriptions;
create policy "push subscriptions are readable by owner"
  on public.push_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions are insertable by owner" on public.push_subscriptions;
create policy "push subscriptions are insertable by owner"
  on public.push_subscriptions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions are updatable by owner" on public.push_subscriptions;
create policy "push subscriptions are updatable by owner"
  on public.push_subscriptions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions are deletable by owner" on public.push_subscriptions;
create policy "push subscriptions are deletable by owner"
  on public.push_subscriptions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  push_subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  reminder_key text not null,
  sent_for_date date not null,
  created_at timestamptz not null default now(),
  constraint push_notification_deliveries_once_per_day unique (
    push_subscription_id,
    reminder_key,
    sent_for_date
  )
);

create index if not exists push_notification_deliveries_user_id_idx
  on public.push_notification_deliveries(user_id);

alter table public.push_notification_deliveries enable row level security;

drop policy if exists "push deliveries are readable by owner" on public.push_notification_deliveries;
create policy "push deliveries are readable by owner"
  on public.push_notification_deliveries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
