-- Security boundaries shared by every application instance.

-- 1. Require a short-lived, server-issued capability for every signup. The
-- Before User Created hook consumes it atomically, so calling Supabase Auth
-- directly with the public key cannot bypass the application's signup policy.
create table if not exists public.signup_authorizations (
  email text primary key,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email))),
  check (length(token) between 32 and 256)
);

alter table public.signup_authorizations enable row level security;
revoke all on table public.signup_authorizations from public, anon, authenticated;
grant all on table public.signup_authorizations to service_role;
grant delete on table public.signup_authorizations to supabase_auth_admin;

create or replace function public.authorize_signup_email(
  p_email text,
  p_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(p_email));
begin
  if normalized_email = '' or length(normalized_email) > 320 then
    raise exception 'Invalid signup email';
  end if;
  if length(p_token) < 32 or length(p_token) > 256 then
    raise exception 'Invalid signup token';
  end if;

  delete from public.signup_authorizations
  where expires_at <= now();

  insert into public.signup_authorizations (email, token, expires_at)
  values (normalized_email, p_token, now() + interval '10 minutes')
  on conflict (email) do update
  set token = excluded.token,
      expires_at = excluded.expires_at,
      created_at = now();
end;
$$;

revoke all on function public.authorize_signup_email(text, text)
  from public, anon, authenticated;
grant execute on function public.authorize_signup_email(text, text)
  to service_role;

create or replace function public.hook_require_signup_authorization(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(event->'user'->>'email'));
  supplied_token text := event->'user'->'user_metadata'->>'signup_authorization_token';
  consumed_email text;
begin
  if normalized_email <> '' and supplied_token is not null then
    delete from public.signup_authorizations
    where email = normalized_email
      and token = supplied_token
      and expires_at > now()
    returning email into consumed_email;
  end if;

  if consumed_email is not null then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Signup is not authorized.'
    )
  );
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_require_signup_authorization(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_require_signup_authorization(jsonb)
  from public, anon, authenticated;

-- 2. Catalog records are shared health data. Only trusted server-side import
-- paths may mutate them; signed-in users retain read and report access.
drop policy if exists "Products are insertable by authenticated users"
  on public.products;
drop policy if exists "Products are updatable by authenticated users"
  on public.products;
drop policy if exists "Unverified products are updatable by authenticated users"
  on public.products;
drop policy if exists "Product nutrition is insertable by authenticated users"
  on public.product_nutrition;
drop policy if exists "Nutrition of unverified products is insertable"
  on public.product_nutrition;
drop policy if exists "Product nutrition is updatable by authenticated users"
  on public.product_nutrition;
drop policy if exists "Nutrition of unverified products is updatable"
  on public.product_nutrition;
drop policy if exists "Product sources are insertable by authenticated users"
  on public.product_sources;
drop policy if exists "Product images are insertable by authenticated users"
  on public.product_images;

revoke insert, update, delete on public.products from authenticated;
revoke insert, update, delete on public.product_nutrition from authenticated;
revoke insert, update, delete on public.product_sources from authenticated;
revoke insert, update, delete on public.product_images from authenticated;

grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.product_nutrition to service_role;
grant select, insert, update, delete on public.product_sources to service_role;
grant select, insert, update, delete on public.product_images to service_role;

-- 3. Durable, atomic quota buckets for paid server operations.
create table if not exists public.server_rate_limits (
  bucket_key text primary key,
  request_count integer not null check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  check (length(bucket_key) between 1 and 240)
);

alter table public.server_rate_limits enable row level security;
revoke all on table public.server_rate_limits from public, anon, authenticated;
grant all on table public.server_rate_limits to service_role;

create or replace function public.consume_server_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  limit_value integer,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  current_reset timestamptz;
  current_time timestamptz := clock_timestamp();
begin
  if p_bucket_key is null or length(p_bucket_key) < 1 or length(p_bucket_key) > 240 then
    raise exception 'Invalid rate-limit key';
  end if;
  if p_limit is null or p_limit < 0 or p_limit > 10000 then
    raise exception 'Invalid rate-limit limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit window';
  end if;

  insert into public.server_rate_limits as buckets (
    bucket_key,
    request_count,
    reset_at,
    updated_at
  )
  values (
    p_bucket_key,
    1,
    current_time + make_interval(secs => p_window_seconds),
    current_time
  )
  on conflict (bucket_key) do update
  set request_count = case
        when buckets.reset_at <= current_time then 1
        else least(buckets.request_count + 1, p_limit + 1)
      end,
      reset_at = case
        when buckets.reset_at <= current_time
          then current_time + make_interval(secs => p_window_seconds)
        else buckets.reset_at
      end,
      updated_at = current_time
  returning buckets.request_count, buckets.reset_at
  into current_count, current_reset;

  return query select
    current_count <= p_limit,
    p_limit,
    greatest(0, p_limit - current_count),
    current_reset,
    case
      when current_count <= p_limit then 0
      else greatest(
        1,
        ceil(extract(epoch from (current_reset - current_time)))::integer
      )
    end;
end;
$$;

revoke all on function public.consume_server_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_server_rate_limit(text, integer, integer)
  to service_role;
