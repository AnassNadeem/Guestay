-- Phase 2A: multi-room orders, refunds, profile extras, payment method prefs
-- Apply after 20260728000000_init.sql

create type public.refund_request_status as enum (
  'pending',
  'approved_processing',
  'refunded',
  'denied'
);

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb,
  add column if not exists last_login_at timestamptz;

create table if not exists public.booking_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  guest_id uuid references public.profiles (id),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  guest_count_total int not null default 1,
  status public.booking_status not null default 'pending_hold',
  preferred_payment_method text
    check (
      preferred_payment_method is null
      or preferred_payment_method in ('jazzcash', 'easypaisa', 'card', 'raast')
    ),
  payment_choice text not null default 'full'
    check (payment_choice in ('full', 'deposit', 'none')),
  subtotal_pkr int not null default 0,
  discount_pkr int not null default 0,
  total_pkr int not null default 0,
  amount_paid_pkr int not null default 0,
  amount_due_pkr int not null default 0,
  hold_expires_at timestamptz,
  session_token text unique,
  is_group_no_advance boolean not null default false,
  gateway_tracker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_orders_guest_idx on public.booking_orders (guest_id);
create index if not exists booking_orders_status_idx on public.booking_orders (status);
create index if not exists booking_orders_hold_idx on public.booking_orders (hold_expires_at)
  where status = 'pending_hold';

alter table public.bookings
  add column if not exists order_id uuid references public.booking_orders (id) on delete cascade;

create index if not exists bookings_order_idx on public.bookings (order_id);

alter table public.payments
  add column if not exists order_id uuid references public.booking_orders (id) on delete cascade,
  add column if not exists preferred_method text,
  add column if not exists refunded_amount_pkr int not null default 0;

-- Allow payments without booking_id when tied to an order
alter table public.payments alter column booking_id drop not null;

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  payment_id uuid not null references public.payments (id),
  guest_id uuid not null references public.profiles (id),
  amount_pkr int not null check (amount_pkr > 0),
  reason text not null,
  notes text,
  status public.refund_request_status not null default 'pending',
  owner_note text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists refund_requests_guest_idx on public.refund_requests (guest_id);
create index if not exists refund_requests_status_idx on public.refund_requests (status);

-- RLS
alter table public.booking_orders enable row level security;
alter table public.refund_requests enable row level security;

create policy booking_orders_guest_read on public.booking_orders for select using (
  guest_id = auth.uid() or public.current_role() in ('owner', 'manager')
);
create policy booking_orders_staff_write on public.booking_orders for all using (
  public.current_role() in ('owner', 'manager')
);

create policy refund_requests_guest_select on public.refund_requests for select using (
  guest_id = auth.uid() or public.current_role() in ('owner', 'manager')
);
create policy refund_requests_guest_insert on public.refund_requests for insert with check (
  guest_id = auth.uid()
);
-- Guests cannot update status; only Owner can decide
create policy refund_requests_owner_update on public.refund_requests for update using (
  public.current_role() = 'owner'
);

-- Expire holds helper (called by cron / service role)
create or replace function public.expire_pending_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.bookings
  set status = 'expired_hold', hold_expires_at = null, updated_at = now()
  where status = 'pending_hold'
    and hold_expires_at is not null
    and hold_expires_at < now();

  get diagnostics n = row_count;

  update public.booking_orders
  set status = 'expired_hold', hold_expires_at = null, updated_at = now()
  where status = 'pending_hold'
    and hold_expires_at is not null
    and hold_expires_at < now();

  return n;
end;
$$;
