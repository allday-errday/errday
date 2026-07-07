-- Fix: the push notification tables had RLS policies but no table grants,
-- so every access failed with "42501 permission denied" (push subscribe,
-- test push, and the reminder cron would all break).

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select on public.push_notification_deliveries to authenticated;

grant select, insert, update, delete on public.push_subscriptions to service_role;
grant select, insert, update, delete on public.push_notification_deliveries to service_role;
