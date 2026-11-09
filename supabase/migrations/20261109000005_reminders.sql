-- Push reminders: browser push subscriptions, a per-user reminder hour, a log
-- of every reminder sent (the proof a reminder went out) and an hourly
-- database job that asks the app to send the morning digest.
--
-- Secrets never live in this file. The cron secret is stored in Supabase Vault
-- as 'reminder_cron_secret' and the same value is set as CRON_SECRET on the
-- server. Functions that act across users check it; nothing else can call them.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.profiles
  add column reminder_hour smallint not null default 9 check (reminder_hour between 0 and 23);
grant update (reminder_hour) on public.profiles to authenticated;

create table public.reminder_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('daily', 'test')),
  local_date date not null,
  devices smallint not null check (devices >= 0),
  delivered smallint not null check (delivered >= 0),
  title text not null check (char_length(title) <= 200),
  sent_at timestamptz not null default now()
);
-- At most one daily digest per user per local day, however often the job runs.
create unique index reminder_log_daily_once on public.reminder_log (user_id, local_date) where kind = 'daily';
create index reminder_log_user_idx on public.reminder_log (user_id, sent_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;
revoke all on public.push_subscriptions, public.reminder_log from anon;

create policy "own subscriptions read" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own subscriptions delete" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));
-- Inserts go through save_push_subscription (an endpoint may move between accounts).
revoke insert, update on public.push_subscriptions from authenticated;

create policy "own reminders read" on public.reminder_log
  for select to authenticated using (user_id = (select auth.uid()));
-- People may log their own test sends; daily digests are logged by the server job only.
create policy "own test reminders insert" on public.reminder_log
  for insert to authenticated with check (user_id = (select auth.uid()) and kind = 'test');
revoke update, delete on public.reminder_log from authenticated;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Register this browser for the signed-in user. The same browser endpoint can
-- only belong to one account, so a previous owner's row is replaced.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create function public.private_cron_secret_ok(p_secret text) returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_secret is not null and length(p_secret) >= 32 and exists (
    select 1 from vault.decrypted_secrets where name = 'reminder_cron_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.private_cron_secret_ok(text) from public, anon, authenticated;

-- Everyone whose reminder hour has come in their own time zone, who has a
-- device registered and has not had today's digest yet, with what the planner
-- needs: today's local date, devices and the household's products.
create function public.reminder_batch(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.private_cron_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'local_date', (now() at time zone p.timezone)::date,
      'subscriptions', (
        select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
        from public.push_subscriptions s where s.user_id = p.id
      ),
      'products', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pr.id, 'name', pr.name, 'expires_on', pr.expires_on, 'category', pr.category,
          'storage', pr.storage, 'price_cents', pr.price_cents))
        from public.products pr where pr.household_id = p.household_id
      ), '[]'::jsonb)
    ))
    from public.profiles p
    where extract(hour from now() at time zone p.timezone) = p.reminder_hour
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
      and not exists (
        select 1 from public.reminder_log l
        where l.user_id = p.id and l.kind = 'daily' and l.local_date = (now() at time zone p.timezone)::date
      )
  ), '[]'::jsonb);
end;
$$;

create function public.reminder_record(p_secret text, p_user uuid, p_local_date date, p_devices int, p_delivered int, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.private_cron_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.reminder_log (user_id, kind, local_date, devices, delivered, title)
  values (p_user, 'daily', p_local_date, p_devices, p_delivered, left(p_title, 200))
  on conflict do nothing;
end;
$$;

-- Push services answer 404/410 for subscriptions that no longer exist.
create function public.reminder_prune(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.private_cron_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

-- Called by the server without a user session; the secret is the only key.
revoke execute on function public.reminder_batch(text), public.reminder_record(text, uuid, date, int, int, text),
  public.reminder_prune(text, text) from public, authenticated;
grant execute on function public.reminder_batch(text), public.reminder_record(text, uuid, date, int, int, text),
  public.reminder_prune(text, text) to anon;

-- ---------------------------------------------------------------------------
-- Hourly job: the database wakes the app, the app sends the pushes
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'savora-morning-reminders',
  '0 * * * *',
  $job$
    select net.http_post(
      url := 'https://savora-mauve.vercel.app/api/reminders/run',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
