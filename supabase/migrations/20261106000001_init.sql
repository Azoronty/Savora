-- SAVORA — initial schema
-- Households own all food data. Every user gets a household on sign-up, and
-- Row Level Security limits every table to members of that household.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.product_category as enum (
  'vegetables', 'fruits', 'dairy', 'meat', 'fish', 'grains', 'bakery', 'drinks', 'other'
);
create type public.storage_location as enum ('fridge', 'freezer', 'pantry');
create type public.quantity_unit as enum ('pcs', 'g', 'kg', 'ml', 'l', 'pack');
create type public.waste_reason as enum ('expired', 'spoiled', 'leftovers', 'overbought', 'other');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Households & membership
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete restrict,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_household_idx on public.profiles (household_id);

-- Households the current user belongs to. SECURITY DEFINER so policies on
-- other tables can use it without recursing into household_members' RLS.
create function public.my_household_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.household_id from public.household_members m where m.user_id = (select auth.uid());
$$;
revoke execute on function public.my_household_ids() from public, anon;
grant execute on function public.my_household_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity < 100000),
  unit public.quantity_unit not null default 'pcs',
  category public.product_category not null default 'other',
  storage public.storage_location not null default 'fridge',
  purchased_on date,
  expires_on date not null,
  price_cents integer check (price_cents is null or price_cents between 0 and 10000000),
  notes text check (notes is null or char_length(notes) <= 500),
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_purchase_before_expiry check (purchased_on is null or purchased_on <= expires_on)
);
create index products_household_expiry_idx on public.products (household_id, expires_on);
create index products_household_category_idx on public.products (household_id, category);

-- ---------------------------------------------------------------------------
-- Shopping list
-- ---------------------------------------------------------------------------
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- Normalised name used to block duplicate open entries.
  name_key text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  quantity numeric(10, 2) not null default 1 check (quantity > 0 and quantity < 100000),
  unit public.quantity_unit not null default 'pcs',
  category public.product_category not null default 'other',
  note text check (note is null or char_length(note) <= 200),
  source text not null default 'manual' check (source in ('manual', 'recipe', 'restock')),
  source_recipe text check (source_recipe is null or char_length(source_recipe) <= 80),
  purchased_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index shopping_items_open_name_uq
  on public.shopping_items (household_id, name_key) where purchased_at is null;
create index shopping_items_household_status_idx on public.shopping_items (household_id, purchased_at);

-- ---------------------------------------------------------------------------
-- Food waste log
-- ---------------------------------------------------------------------------
create table public.waste_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null check (char_length(btrim(product_name)) between 1 and 80),
  category public.product_category not null default 'other',
  quantity numeric(10, 2) not null check (quantity > 0 and quantity < 100000),
  unit public.quantity_unit not null default 'pcs',
  reason public.waste_reason not null,
  discarded_on date not null default current_date,
  cost_cents integer check (cost_cents is null or cost_cents between 0 and 10000000),
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index waste_records_household_date_idx on public.waste_records (household_id, discarded_on desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger households_updated_at before update on public.households
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger shopping_items_updated_at before update on public.shopping_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user bootstrap: household + membership + profile
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  new_household_id uuid;
begin
  insert into public.households (name)
  values (coalesce(nullif(btrim(new.raw_user_meta_data ->> 'household_name'), ''), 'My kitchen'))
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  insert into public.profiles (id, household_id, display_name)
  values (new.id, new_household_id, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''));

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.shopping_items enable row level security;
alter table public.waste_records enable row level security;

-- Anonymous (signed-out) visitors never touch household data.
revoke all on public.households, public.household_members, public.profiles,
  public.products, public.shopping_items, public.waste_records from anon;

create policy "members read household" on public.households
  for select to authenticated using (id in (select public.my_household_ids()));
create policy "members rename household" on public.households
  for update to authenticated
  using (id in (select public.my_household_ids()))
  with check (id in (select public.my_household_ids()));

create policy "read own memberships" on public.household_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Users may edit their name and onboarding state, never their household link.
revoke update on public.profiles from authenticated;
grant update (display_name, onboarded_at) on public.profiles to authenticated;
revoke insert, delete on public.profiles, public.households, public.household_members from authenticated;

-- Household-scoped tables share one set of policies.
do $$
declare
  t text;
begin
  foreach t in array array['products', 'shopping_items', 'waste_records'] loop
    execute format(
      'create policy "members read" on public.%I for select to authenticated
         using (household_id in (select public.my_household_ids()))', t);
    execute format(
      'create policy "members insert" on public.%I for insert to authenticated
         with check (household_id in (select public.my_household_ids()))', t);
    execute format(
      'create policy "members update" on public.%I for update to authenticated
         using (household_id in (select public.my_household_ids()))
         with check (household_id in (select public.my_household_ids()))', t);
    execute format(
      'create policy "members delete" on public.%I for delete to authenticated
         using (household_id in (select public.my_household_ids()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic operations (SECURITY INVOKER: RLS still applies to every statement)
-- ---------------------------------------------------------------------------

-- Discard all or part of a product: writes a waste record and reduces or
-- removes the product in one transaction. Cost is pro-rated from the price.
create function public.discard_product(
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
    (household_id, product_id, product_name, category, quantity, unit, reason, discarded_on, cost_cents, is_demo)
  values (
    p.household_id,
    case when p_quantity < p.quantity then p.id end,
    p.name, p.category, p_quantity, p.unit, p_reason,
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

-- Mark all or part of a product as used (eaten / cooked).
create function public.consume_product(p_product_id uuid, p_quantity numeric) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  p public.products%rowtype;
begin
  select * into p from public.products where id = p_product_id for update;
  if not found then
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
end;
$$;

-- Move purchased shopping items into the inventory in one transaction.
-- p_items: [{ "shopping_item_id", "name", "quantity", "unit", "category",
--             "storage", "expires_on", "price_cents" }]
create function public.stock_purchased_items(p_items jsonb, p_purchased_on date) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  s public.shopping_items%rowtype;
  stocked integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No items to stock' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    select * into s from public.shopping_items
     where id = (item ->> 'shopping_item_id')::uuid for update;
    if not found then
      raise exception 'Shopping item not found' using errcode = 'P0002';
    end if;

    insert into public.products
      (household_id, name, quantity, unit, category, storage, purchased_on, expires_on, price_cents, is_demo)
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
      s.is_demo
    );

    delete from public.shopping_items where id = s.id;
    stocked := stocked + 1;
  end loop;

  return stocked;
end;
$$;

revoke execute on function public.discard_product(uuid, numeric, public.waste_reason, date) from public, anon;
revoke execute on function public.consume_product(uuid, numeric) from public, anon;
revoke execute on function public.stock_purchased_items(jsonb, date) from public, anon;
grant execute on function public.discard_product(uuid, numeric, public.waste_reason, date) to authenticated;
grant execute on function public.consume_product(uuid, numeric) to authenticated;
grant execute on function public.stock_purchased_items(jsonb, date) to authenticated;
