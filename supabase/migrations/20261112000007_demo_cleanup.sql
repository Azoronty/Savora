-- Every "Explore the live demo" creates an anonymous user with a seeded
-- kitchen. A nightly job removes demo accounts older than 7 days, with their
-- households and everything in them. Real (non-anonymous) accounts are never
-- touched, and a household that also has a real member is kept.

create or replace function public.cleanup_demo_accounts(p_older_than interval default interval '7 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_users uuid[];
  v_homes uuid[];
begin
  select coalesce(array_agg(u.id), '{}') into v_users
  from auth.users u
  where u.is_anonymous and u.created_at < now() - p_older_than;

  select coalesce(array_agg(distinct m.household_id), '{}') into v_homes
  from public.household_members m
  where m.user_id = any(v_users)
    and not exists (
      select 1 from public.household_members other
      where other.household_id = m.household_id and not (other.user_id = any(v_users))
    );

  -- Profiles, memberships, push subscriptions and reminder logs go with the users.
  delete from auth.users where id = any(v_users);
  -- Products, shopping, waste, history and Savi XP go with the households.
  delete from public.households where id = any(v_homes);
  return coalesce(array_length(v_users, 1), 0);
end;
$$;

revoke execute on function public.cleanup_demo_accounts(interval) from public, anon, authenticated;

select cron.schedule('savora-demo-cleanup', '17 3 * * *', $job$ select public.cleanup_demo_accounts(); $job$);
