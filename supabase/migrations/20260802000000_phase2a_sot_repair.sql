-- Phase 2A SoT repair: columns missing on remote vs app write paths,
-- and alias current_user_role() for phase2b RLS policies.

alter table public.bookings
  add column if not exists gateway_tracker text;

alter table public.bookings
  add column if not exists cart_item_id text;

create index if not exists bookings_gateway_tracker_idx
  on public.bookings (gateway_tracker)
  where gateway_tracker is not null;

create index if not exists payments_gateway_tracker_idx
  on public.payments (gateway_tracker)
  where gateway_tracker is not null;

-- Profile fields from phase2b (safe if already present)
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists legal_name text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists date_of_birth date;

-- Alias used by phase2b RLS; init only defines current_role()
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role();
$$;

-- name_change_requests may be missing if phase2b never applied
create table if not exists public.name_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  current_legal_name text not null,
  requested_legal_name text not null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  reviewer_id uuid references public.profiles (id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists name_change_requests_user_idx
  on public.name_change_requests (user_id);
create index if not exists name_change_requests_status_idx
  on public.name_change_requests (status);

alter table public.name_change_requests enable row level security;
