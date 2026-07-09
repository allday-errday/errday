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

drop policy if exists "push deliveries are readable by owner" on public.push_notification_deliveries;
create policy "push deliveries are readable by owner"
  on public.push_notification_deliveries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
