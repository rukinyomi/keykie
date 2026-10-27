-- Run this file in Supabase SQL Editor after creating the project.
create table if not exists public.keykie_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key check (id ~ '^KK[0-9]{8}$'),
  created_at timestamptz not null,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'processing', 'shipping', 'completed', 'cancelled')),
  order_data jsonb not null
    check (jsonb_typeof(order_data) = 'object' and order_data ->> 'id' = id)
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.keykie_admins enable row level security;
alter table public.orders enable row level security;

revoke all on public.keykie_admins from anon, authenticated;
grant select on public.keykie_admins to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

drop policy if exists "Admins can read own admin access" on public.keykie_admins;
create policy "Admins can read own admin access"
  on public.keykie_admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Public can create unpaid orders" on public.orders;
create policy "Public can create unpaid orders"
  on public.orders for insert to anon, authenticated
  with check (
    status = 'unpaid'
    and order_data ->> 'status' = 'unpaid'
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
