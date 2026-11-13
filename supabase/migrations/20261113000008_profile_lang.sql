-- Interface language per person, so the server sends the morning push in the
-- language they chose with the RU / EN switch.
alter table public.profiles
  add column lang text not null default 'en' check (lang in ('en', 'ru'));
grant update (lang) on public.profiles to authenticated;

-- Same as before, plus each person's language.
create or replace function public.reminder_batch(p_secret text)
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
      'lang', p.lang,
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
