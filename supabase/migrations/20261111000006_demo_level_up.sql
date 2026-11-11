-- Demo-only shortcut so a presentation can show Savi growing through its
-- stages. The XP ledger stays honest: the rows have their own kind
-- ('demo_boost'), and the function refuses to run for real (non-anonymous)
-- accounts, whatever the client sends.

alter type public.savi_event_kind add value if not exists 'demo_boost';

-- Adds exactly enough XP to reach the next stage (rows of at most 100 XP,
-- the ledger's per-row limit). Returns the new total.
create function public.savi_demo_level_up() returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  hh uuid;
  total bigint;
  target int;
  remaining int;
  step int;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'Levelling up is only available in the demo' using errcode = '42501';
  end if;
  select p.household_id into hh from public.profiles p where p.id = (select auth.uid());
  if hh is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select coalesce(sum(e.xp), 0) into total from public.savi_events e where e.household_id = hh;
  -- Stage thresholds, same as SAVI_STAGES in lib/domain/savi.ts.
  select min(t) into target from unnest(array[60, 160, 320, 560, 900, 1400]) as t where t > total;
  if target is null then
    return total; -- already at the final stage
  end if;

  remaining := target - total;
  while remaining > 0 loop
    step := least(100, remaining);
    insert into public.savi_events (household_id, user_id, kind, xp, label, local_day)
    values (hh, (select auth.uid()), 'demo_boost', step, 'Demo boost', public.savi_local_day());
    remaining := remaining - step;
  end loop;
  return target;
end;
$$;

revoke execute on function public.savi_demo_level_up() from public, anon;
grant execute on function public.savi_demo_level_up() to authenticated;
