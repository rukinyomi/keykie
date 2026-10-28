-- Run this file in Supabase SQL Editor after creating the project.
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

alter table public.orders enable row level security;

do $$
begin
  if to_regclass('public.keykie_admins') is not null then
    execute 'revoke all on table public.keykie_admins from anon, authenticated';
    execute 'drop policy if exists "Admins can read own admin access" on public.keykie_admins';
  end if;
end;
$$;
grant usage on schema public to anon, authenticated;
revoke all on public.orders from public, anon, authenticated;
grant insert on public.orders to anon, authenticated;

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
drop policy if exists "Admins can update orders" on public.orders;

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

-- Customers can confirm receipt only for their own active order.
create or replace function public.complete_delivered_order(p_order_id text, p_cancellation_token text)
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
    status = 'completed',
    order_data = jsonb_set(order_data, '{status}', '"completed"'::jsonb)
  where id = p_order_id
    and status not in ('completed', 'cancelled')
    and order_data ->> 'cancellationToken' = p_cancellation_token;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.complete_delivered_order(text, text) from public, anon, authenticated;
grant execute on function public.complete_delivered_order(text, text) to anon, authenticated;

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
    'courier', orders.order_data -> 'courier',
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

notify pgrst, 'reload schema';
