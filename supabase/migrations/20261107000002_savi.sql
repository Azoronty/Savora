-- Savi companion: XP ledger, daily missions and per-user preferences.
-- XP is awarded only inside the database, as a side effect of real inventory
-- actions, so a client cannot grant itself XP.

create type public.savi_event_kind as enum (
  'product_added', 'product_used', 'food_rescued', 'recipe_cooked', 'shopping_stocked', 'mission_completed'
);
create type public.savi_mode as enum ('full', 'quiet', 'hidden');

alter table public.profiles
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  add column savi_mode public.savi_mode not null default 'full';
grant update (timezone, savi_mode) on public.profiles to authenticated;

create table public.savi_events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind public.savi_event_kind not null,
  xp integer not null check (xp between 0 and 100),
  ref_id uuid,
  label text check (label is null or char_length(label) <= 80),
  local_day date not null,
  created_at timestamptz not null default now()
);
create index savi_events_household_day_idx on public.savi_events (household_id, local_day, kind);
create index savi_events_household_created_idx on public.savi_events (household_id, created_at desc);

create table public.savi_missions (
  household_id uuid not null references public.households (id) on delete cascade,
  mission text not null check (mission in ('rescue', 'cook', 'stock')),
  local_day date not null,
  completed_at timestamptz not null default now(),
  primary key (household_id, mission, local_day)
);

alter table public.savi_events enable row level security;
alter table public.savi_missions enable row level security;
revoke all on public.savi_events, public.savi_missions from anon;
revoke insert, update, delete on public.savi_events, public.savi_missions from authenticated;
create policy "members read" on public.savi_events
  for select to authenticated using (household_id in (select public.my_household_ids()));
create policy "members read" on public.savi_missions
  for select to authenticated using (household_id in (select public.my_household_ids()));

-- The calling user's local calendar date (falls back to UTC for a bad zone).
create function public.savi_local_day() returns date
language plpgsql stable security definer set search_path = '' as $$
declare
  tz text;
begin
  select p.timezone into tz from public.profiles p where p.id = (select auth.uid());
  return (now() at time zone coalesce(tz, 'UTC'))::date;
exception when others then
  return (now() at time zone 'UTC')::date;
end;
$$;

-- Records an event with its XP (respecting daily caps) and completes any
-- daily mission it satisfies. Not callable by clients: only by the trigger
-- and functions below, which perform their own authorisation.
create function public.savi_award(p_household uuid, p_kind public.savi_event_kind, p_ref uuid, p_label text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := public.savi_local_day();
  v_xp integer;
  v_cap integer;
  v_count integer;
  m record;
begin
  v_xp := case p_kind
    when 'product_added' then 2
    when 'product_used' then 3
    when 'food_rescued' then 15
    when 'recipe_cooked' then 20
    when 'shopping_stocked' then 10
    else 0 end;
  v_cap := case p_kind when 'recipe_cooked' then 3 when 'shopping_stocked' then 3 else 10 end;

  select count(*) into v_count from public.savi_events e
   where e.household_id = p_household and e.kind = p_kind and e.local_day = v_day;
  if v_count >= v_cap then
    return; -- daily cap reached: no more XP from this kind of action today
  end if;

  insert into public.savi_events (household_id, user_id, kind, xp, ref_id, label, local_day)
  values (p_household, (select auth.uid()), p_kind, v_xp, p_ref, left(p_label, 80), v_day);

  -- Daily missions: rescue (30 XP), cook (30 XP), stock (20 XP).
  for m in
    select * from (values
      ('rescue', 30, exists (select 1 from public.savi_events e where e.household_id = p_household and e.local_day = v_day and e.kind = 'food_rescued')),
      ('cook', 30, exists (select 1 from public.savi_events e where e.household_id = p_household and e.local_day = v_day and e.kind = 'recipe_cooked')),
      ('stock', 20, (select count(*) >= 3 from public.savi_events e where e.household_id = p_household and e.local_day = v_day and e.kind = 'product_added')
                    or exists (select 1 from public.savi_events e where e.household_id = p_household and e.local_day = v_day and e.kind = 'shopping_stocked'))
    ) as t(mission, xp, done)
  loop
    if m.done then
      insert into public.savi_missions (household_id, mission, local_day)
      values (p_household, m.mission, v_day)
      on conflict do nothing;
      if found then
        insert into public.savi_events (household_id, user_id, kind, xp, label, local_day)
        values (p_household, (select auth.uid()), 'mission_completed', m.xp, m.mission, v_day);
      end if;
    end if;
  end loop;
end;
$$;
revoke execute on function public.savi_award(uuid, public.savi_event_kind, uuid, text) from public, anon, authenticated;
revoke execute on function public.savi_local_day() from public, anon;

-- Adding a real product earns a little XP. Sample (demo) rows earn nothing.
create function public.savi_on_product_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_demo and (select auth.uid()) is not null then
    perform public.savi_award(new.household_id, 'product_added', new.id, new.name);
  end if;
  return new;
end;
$$;
revoke execute on function public.savi_on_product_insert() from public, anon, authenticated;
create trigger products_savi_award after insert on public.products
  for each row execute function public.savi_on_product_insert();

-- consume_product now also awards XP, so it runs as definer with an
-- explicit household check in place of RLS.
create or replace function public.consume_product(p_product_id uuid, p_quantity numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.products%rowtype;
  days_left integer;
begin
  select * into p from public.products where id = p_product_id for update;
  if not found or p.household_id not in (select public.my_household_ids()) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > p.quantity then
    raise exception 'Quantity must be between 0 and %', p.quantity using errcode = '22023';
  end if;

  if p_quantity < p.quantity then
    update public.products
       set quantity = quantity - p_quantity,
           price_cents = case when price_cents is not null
                              then round(price_cents * (quantity - p_quantity) / quantity)::integer end
     where id = p.id;
  else
    delete from public.products where id = p.id;
  end if;

  -- Using food before its date counts; within the use-soon window it is a rescue.
  days_left := p.expires_on - public.savi_local_day();
  if days_left between 0 and 3 then
    perform public.savi_award(p.household_id, 'food_rescued', p.id, p.name);
  elsif days_left > 3 then
    perform public.savi_award(p.household_id, 'product_used', p.id, p.name);
  end if;
end;
$$;

-- "I cooked this": consume several products and record the recipe.
-- p_items: [{ "id": uuid, "quantity": number }]
create function public.cook_recipe(p_recipe text, p_items jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  used integer := 0;
  v_household uuid;
begin
  if p_recipe is null or char_length(p_recipe) not between 1 and 80 then
    raise exception 'Unknown recipe' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Pick between 1 and 30 items' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select household_id into v_household from public.products where id = (item ->> 'id')::uuid;
    perform public.consume_product((item ->> 'id')::uuid, (item ->> 'quantity')::numeric);
    used := used + 1;
  end loop;
  perform public.savi_award(v_household, 'recipe_cooked', null, p_recipe);
  return used;
end;
$$;

-- stock_purchased_items also awards XP now: definer + explicit household check.
create or replace function public.stock_purchased_items(p_items jsonb, p_purchased_on date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  s public.shopping_items%rowtype;
  stocked integer := 0;
  v_household uuid;
  v_demo boolean := true;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No items to stock' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    select * into s from public.shopping_items
     where id = (item ->> 'shopping_item_id')::uuid for update;
    if not found or s.household_id not in (select public.my_household_ids()) then
      raise exception 'Shopping item not found' using errcode = 'P0002';
    end if;

    insert into public.products
      (household_id, name, quantity, unit, category, storage, purchased_on, expires_on, price_cents, is_demo, created_by)
    values (
      s.household_id,
      item ->> 'name',
      (item ->> 'quantity')::numeric,
      (item ->> 'unit')::public.quantity_unit,
      (item ->> 'category')::public.product_category,
      (item ->> 'storage')::public.storage_location,
      p_purchased_on,
      (item ->> 'expires_on')::date,
      nullif(item ->> 'price_cents', '')::integer,
      s.is_demo,
      (select auth.uid())
    );

    delete from public.shopping_items where id = s.id;
    stocked := stocked + 1;
    v_household := s.household_id;
    v_demo := v_demo and s.is_demo;
  end loop;

  if not v_demo then
    perform public.savi_award(v_household, 'shopping_stocked', null, stocked || case when stocked = 1 then ' item' else ' items' end);
  end if;
  return stocked;
end;
$$;

-- Total XP for the caller's household (RLS applies).
create function public.savi_total_xp() returns bigint
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(e.xp), 0) from public.savi_events e
   where e.household_id in (select public.my_household_ids());
$$;

revoke execute on function public.cook_recipe(text, jsonb) from public, anon;
revoke execute on function public.savi_total_xp() from public, anon;
grant execute on function public.cook_recipe(text, jsonb) to authenticated;
grant execute on function public.savi_total_xp() to authenticated;
grant execute on function public.consume_product(uuid, numeric) to authenticated;
grant execute on function public.stock_purchased_items(jsonb, date) to authenticated;
