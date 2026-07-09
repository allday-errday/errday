-- Release hardening: delete unconfirmed accounts after 6 hours and lock
-- verified products against edits once the app is open for signups.

-- 1. Unconfirmed-account cleanup (runs every 30 minutes)
create extension if not exists pg_cron;

select cron.schedule(
  'delete-unconfirmed-accounts',
  '*/30 * * * *',
  $$
    delete from auth.users
    where email_confirmed_at is null
      and created_at < now() - interval '6 hours'
  $$
);

-- 2. Verified products are locked; the community can only improve
--    unverified/pending entries. (products INSERT stays open on purpose —
--    it is a shared catalog.)
drop policy "Products are updatable by authenticated users" on public.products;
create policy "Unverified products are updatable by authenticated users"
  on public.products for update to authenticated
  using (status <> 'verified')
  with check (true);

drop policy "Product nutrition is insertable by authenticated users" on public.product_nutrition;
create policy "Nutrition of unverified products is insertable"
  on public.product_nutrition for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status <> 'verified'
    )
  );

drop policy "Product nutrition is updatable by authenticated users" on public.product_nutrition;
create policy "Nutrition of unverified products is updatable"
  on public.product_nutrition for update to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status <> 'verified'
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status <> 'verified'
    )
  );
