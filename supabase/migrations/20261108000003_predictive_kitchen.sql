-- Predictive Kitchen: an append-only history of what was bought, used and
-- thrown away. It is written only by the database (triggers and definer
-- functions), so the statistics built on it reflect real inventory changes.

create type public.inventory_event_kind as enum ('bought', 'used', 'wasted');

-- Stable identity for grouping history ("Whole milk" and "Milk" are both "milk").
-- Computed by the app from its food catalog; falls back to the lower-cased name.
alter table public.products
  add column item_key text check (item_key is null or char_length(item_key) between 1 and 80);
update public.products set item_key = lower(btrim(name)) where item_key is null;

alter table public.waste_records
  add column item_key text check (item_key is null or char_length(item_key) between 1 and 80);

create table public.inventory_events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  product_id uuid,
  item_key text not null check (char_length(item_key) between 1 and 80),
  item_name text not null check (char_length(item_name) between 1 and 80),
  kind public.inventory_event_kind not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit public.quantity_unit not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  occurred_on date not null,
  -- For used/wasted: whole days between purchase and the event.
  days_held integer check (days_held is null or days_held >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index inventory_events_household_item_idx on public.inventory_events (household_id, item_key, occurred_on);
create index inventory_events_household_date_idx on public.inventory_events (household_id, occurred_on desc);

alter table public.inventory_events enable row level security;
revoke all on public.inventory_events from anon;
revoke insert, update, delete on public.inventory_events from authenticated;
create policy "members read" on public.inventory_events
  for select to authenticated using (household_id in (select public.my_household_ids()));

-- bought: every product that enters the inventory.
create function public.log_product_bought() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.inventory_events
    (household_id, product_id, item_key, item_name, kind, quantity, unit, price_cents, occurred_on, is_demo)
  values (
    new.household_id, new.id, coalesce(new.item_key, lower(btrim(new.name))), new.name, 'bought',
    new.quantity, new.unit, new.price_cents, coalesce(new.purchased_on, public.savi_local_day()), new.is_demo
  );
  return new;
end;
$$;
revoke execute on function public.log_product_bought() from public, anon, authenticated;
create trigger products_log_bought after insert on public.products
  for each row execute function public.log_product_bought();

-- wasted: every waste record (from "Throw away" or logged by hand).
create function public.log_waste_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.inventory_events
    (household_id, product_id, item_key, item_name, kind, quantity, unit, price_cents, occurred_on, is_demo)
  values (
    new.household_id, new.product_id, coalesce(new.item_key, lower(btrim(new.product_name))), new.product_name,
    'wasted', new.quantity, new.unit, new.cost_cents, new.discarded_on, new.is_demo
  );
  return new;
end;
$$;
revoke execute on function public.log_waste_event() from public, anon, authenticated;
create trigger waste_records_log_event after insert on public.waste_records
  for each row execute function public.log_waste_event();

-- discard_product now carries the item key into the waste record.
create or replace function public.discard_product(
  p_product_id uuid,
  p_quantity numeric,
  p_reason public.waste_reason,
  p_discarded_on date
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  p public.products%rowtype;
  record_id uuid;
begin
  select * into p from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > p.quantity then
    raise exception 'Quantity must be between 0 and %', p.quantity using errcode = '22023';
  end if;

  insert into public.waste_records
    (household_id, product_id, item_key, product_name, category, quantity, unit, reason, discarded_on, cost_cents, is_demo)
  values (
    p.household_id,
    case when p_quantity < p.quantity then p.id end,
    p.item_key, p.name, p.category, p_quantity, p.unit, p_reason,
    coalesce(p_discarded_on, current_date),
    case when p.price_cents is not null then round(p.price_cents * p_quantity / p.quantity)::integer end,
    p.is_demo
  )
  returning id into record_id;

  if p_quantity < p.quantity then
    update public.products
       set quantity = quantity - p_quantity,
           price_cents = case when price_cents is not null
                              then round(price_cents * (quantity - p_quantity) / quantity)::integer end
     where id = p.id;
  else
    delete from public.products where id = p.id;
  end if;

  return record_id;
end;
$$;

-- consume_product: also records the "used" event (with days held) for history.
create or replace function public.consume_product(p_product_id uuid, p_quantity numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.products%rowtype;
  v_day date := public.savi_local_day();
  days_left integer;
begin
  select * into p from public.products where id = p_product_id for update;
  if not found or p.household_id not in (select public.my_household_ids()) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > p.quantity then
    raise exception 'Quantity must be between 0 and %', p.quantity using errcode = '22023';
  end if;

  insert into public.inventory_events
    (household_id, product_id, item_key, item_name, kind, quantity, unit, price_cents, occurred_on, days_held, is_demo)
  values (
    p.household_id, p.id, coalesce(p.item_key, lower(btrim(p.name))), p.name, 'used', p_quantity, p.unit,
    case when p.price_cents is not null then round(p.price_cents * p_quantity / p.quantity)::integer end,
    v_day, greatest(0, v_day - coalesce(p.purchased_on, p.created_at::date)), p.is_demo
  );

  if p_quantity < p.quantity then
    update public.products
       set quantity = quantity - p_quantity,
           price_cents = case when price_cents is not null
                              then round(price_cents * (quantity - p_quantity) / quantity)::integer end
     where id = p.id;
  else
    delete from public.products where id = p.id;
  end if;

  days_left := p.expires_on - v_day;
  if days_left between 0 and 3 then
    perform public.savi_award(p.household_id, 'food_rescued', p.id, p.name);
  elsif days_left > 3 then
    perform public.savi_award(p.household_id, 'product_used', p.id, p.name);
  end if;
end;
$$;

-- stock_purchased_items: accepts an optional item_key per item.
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
      (household_id, name, item_key, quantity, unit, category, storage, purchased_on, expires_on, price_cents, is_demo, created_by)
    values (
      s.household_id,
      item ->> 'name',
      nullif(left(item ->> 'item_key', 80), ''),
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

-- Sample purchase history for the demo kitchen (flagged is_demo, shown as sample data).
-- Inserted once per household, dated relative to the caller's local day.
create function public.seed_demo_history() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid;
  v_day date := public.savi_local_day();
  inserted integer;
begin
  select p.household_id into v_household from public.profiles p where p.id = (select auth.uid());
  if v_household is null then
    raise exception 'No household' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.inventory_events e where e.household_id = v_household and e.is_demo and e.occurred_on < v_day - 10) then
    return 0;
  end if;

  insert into public.inventory_events (household_id, item_key, item_name, kind, quantity, unit, price_cents, occurred_on, days_held, is_demo)
  select v_household, h.item_key, h.item_name, h.kind::public.inventory_event_kind, h.qty, h.unit::public.quantity_unit, h.price, v_day - h.ago, h.held, true
  from (values
    -- Milk: 2 L every week, roughly a third poured away.
    ('milk', 'Whole milk', 'bought', 2.0, 'l', 298, 37, null::int), ('milk', 'Whole milk', 'used', 1.3, 'l', null, 31, 6), ('milk', 'Whole milk', 'wasted', 0.7, 'l', 104, 30, null),
    ('milk', 'Whole milk', 'bought', 2.0, 'l', 298, 30, null), ('milk', 'Whole milk', 'used', 1.5, 'l', null, 24, 6), ('milk', 'Whole milk', 'wasted', 0.5, 'l', 74, 23, null),
    ('milk', 'Whole milk', 'bought', 2.0, 'l', 298, 23, null), ('milk', 'Whole milk', 'used', 1.2, 'l', null, 17, 6), ('milk', 'Whole milk', 'wasted', 0.8, 'l', 119, 16, null),
    ('milk', 'Whole milk', 'bought', 2.0, 'l', 298, 16, null), ('milk', 'Whole milk', 'used', 1.4, 'l', null, 11, 5), ('milk', 'Whole milk', 'wasted', 0.6, 'l', 89, 10, null),
    -- Spinach: 200 g bags, about half wilts.
    ('spinach', 'Baby spinach', 'bought', 200, 'g', 329, 32, null), ('spinach', 'Baby spinach', 'used', 100, 'g', null, 29, 3), ('spinach', 'Baby spinach', 'wasted', 100, 'g', 165, 27, null),
    ('spinach', 'Baby spinach', 'bought', 200, 'g', 329, 25, null), ('spinach', 'Baby spinach', 'used', 120, 'g', null, 22, 3), ('spinach', 'Baby spinach', 'wasted', 80, 'g', 132, 20, null),
    ('spinach', 'Baby spinach', 'bought', 200, 'g', 329, 18, null), ('spinach', 'Baby spinach', 'used', 80, 'g', null, 15, 3), ('spinach', 'Baby spinach', 'wasted', 120, 'g', 197, 13, null),
    -- Bananas: 6 at a time, 4 get eaten.
    ('banana', 'Bananas', 'bought', 6, 'pcs', 199, 28, null), ('banana', 'Bananas', 'used', 4, 'pcs', null, 23, 5), ('banana', 'Bananas', 'wasted', 2, 'pcs', 66, 22, null),
    ('banana', 'Bananas', 'bought', 6, 'pcs', 199, 21, null), ('banana', 'Bananas', 'used', 5, 'pcs', null, 16, 5), ('banana', 'Bananas', 'wasted', 1, 'pcs', 33, 15, null),
    ('banana', 'Bananas', 'bought', 6, 'pcs', 199, 14, null), ('banana', 'Bananas', 'used', 4, 'pcs', null, 9, 5), ('banana', 'Bananas', 'wasted', 2, 'pcs', 66, 8, null),
    -- Eggs: used up steadily, nothing wasted.
    ('egg', 'Free-range eggs', 'bought', 12, 'pcs', 649, 34, null), ('egg', 'Free-range eggs', 'used', 12, 'pcs', null, 21, 13),
    ('egg', 'Free-range eggs', 'bought', 12, 'pcs', 649, 20, null), ('egg', 'Free-range eggs', 'used', 12, 'pcs', null, 7, 13),
    -- Greek yogurt: a 500 g tub lasts about 12 days.
    ('yogurt', 'Greek yogurt', 'bought', 500, 'g', 299, 29, null), ('yogurt', 'Greek yogurt', 'used', 500, 'g', null, 17, 12),
    ('yogurt', 'Greek yogurt', 'bought', 500, 'g', 299, 19, null), ('yogurt', 'Greek yogurt', 'used', 500, 'g', null, 7, 12),
    -- Chicken: cooked within two days.
    ('chicken', 'Chicken thighs', 'bought', 500, 'g', 649, 22, null), ('chicken', 'Chicken thighs', 'used', 500, 'g', null, 20, 2),
    ('chicken', 'Chicken thighs', 'bought', 500, 'g', 649, 12, null), ('chicken', 'Chicken thighs', 'used', 500, 'g', null, 10, 2)
  ) as h(item_key, item_name, kind, qty, unit, price, ago, held);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke execute on function public.seed_demo_history() from public, anon;
grant execute on function public.seed_demo_history() to authenticated;
grant execute on function public.consume_product(uuid, numeric) to authenticated;
grant execute on function public.stock_purchased_items(jsonb, date) to authenticated;

-- Remove sample history together with the rest of the sample kitchen.
create function public.clear_demo_history() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  removed integer;
begin
  delete from public.inventory_events e
   where e.is_demo and e.household_id in (select public.my_household_ids());
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke execute on function public.clear_demo_history() from public, anon;
grant execute on function public.clear_demo_history() to authenticated;
