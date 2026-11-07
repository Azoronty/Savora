-- Fix: seed_demo_history skipped itself when the sample products were inserted first.
-- Their trigger logs old 'bought' events, which the old guard mistook for seeded history.
-- Only seeded history has 'used' events dated in the past (consume_product logs today),
-- so the guard now looks for those.
create or replace function public.seed_demo_history() returns integer
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
  if exists (select 1 from public.inventory_events e where e.household_id = v_household and e.is_demo and e.kind = 'used' and e.occurred_on < v_day - 10) then
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
