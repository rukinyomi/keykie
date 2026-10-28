-- Run this file in Supabase SQL Editor after creating the project.
create table if not exists public.keykie_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key check (id ~ '^KK[0-9]{8}$'),
  created_at timestamptz not null,
  status text not null default 'unpaid'
    check (status in ('awaiting_shipping', 'unpaid', 'processing', 'shipping', 'completed', 'cancelled')),
  order_data jsonb not null
    check (jsonb_typeof(order_data) = 'object' and order_data ->> 'id' = id)
);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('awaiting_shipping', 'unpaid', 'processing', 'shipping', 'completed', 'cancelled'));

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.keykie_admins enable row level security;
alter table public.orders enable row level security;

revoke all on public.keykie_admins from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.keykie_admins to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

drop policy if exists "Admins can read own admin access" on public.keykie_admins;
create policy "Admins can read own admin access"
  on public.keykie_admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Public can create unpaid orders" on public.orders;
create policy "Public can create unpaid orders"
  on public.orders as permissive
  for insert to anon, authenticated
  with check (
    status in ('unpaid', 'awaiting_shipping')
    and order_data ->> 'status' = status
    and order_data ->> 'id' = id
  );

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
  on public.orders for select to authenticated
  using (
    exists (
      select 1 from public.keykie_admins
      where keykie_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update to authenticated
  using (
    exists (
      select 1 from public.keykie_admins
      where keykie_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.keykie_admins
      where keykie_admins.user_id = (select auth.uid())
    )
  );

-- Customers can cancel their own unpaid order with its private checkout token.
create or replace function public.cancel_unpaid_order(p_order_id text, p_cancellation_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.orders
  set
    status = 'cancelled',
    order_data = jsonb_set(order_data, '{status}', '"cancelled"'::jsonb)
  where id = p_order_id
    and status in ('unpaid', 'awaiting_shipping')
    and order_data ->> 'cancellationToken' = p_cancellation_token;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.cancel_unpaid_order(text, text) from public, anon, authenticated;
grant execute on function public.cancel_unpaid_order(text, text) to anon, authenticated;

create or replace function public.get_customer_order(p_order_id text, p_cancellation_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select order_data
  from public.orders
  where id = p_order_id
    and order_data ->> 'cancellationToken' = p_cancellation_token
  limit 1;
$$;

revoke all on function public.get_customer_order(text, text) from public, anon, authenticated;
grant execute on function public.get_customer_order(text, text) to anon, authenticated;

-- Return only customer-visible order status and totals, matched by order ID and phone.
create or replace function public.get_customer_order_status(p_order_id text, p_customer_phone text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', orders.id,
    'status', orders.status,
    'shippingDistanceKm', orders.order_data -> 'shippingDistanceKm',
    'shippingCost', orders.order_data -> 'shippingCost',
    'shippingFreeByDistance', orders.order_data -> 'shippingFreeByDistance',
    'shippingFreeByVoucher', orders.order_data -> 'shippingFreeByVoucher',
    'total', orders.order_data -> 'total'
  )
  from public.orders
  where orders.id = p_order_id
    and length(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g')) >= 8
    and regexp_replace(coalesce(orders.order_data #>> '{customer,phone}', ''), '[^0-9]', '', 'g')
      = regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g')
  limit 1;
$$;

revoke all on function public.get_customer_order_status(text, text) from public, anon, authenticated;
grant execute on function public.get_customer_order_status(text, text) to anon, authenticated;

-- After creating the admin in Authentication > Users, run this query separately.
-- Replace the email below with the exact email shown in the Users list.
insert into public.keykie_admins (user_id)
select id
from auth.users
where lower(email) = lower('gagego799@gmail.com')
on conflict (user_id) do nothing;

-- This returns true only when the email exists and its user ID is in keykie_admins.
-- If no row is returned, check that the email matches Authentication > Users.
select
  users.email,
  users.id as user_id,
  (admins.user_id is not null) as admin_access
from auth.users as users
left join public.keykie_admins as admins on admins.user_id = users.id
where lower(users.email) = lower('gagego799@gmail.com');
