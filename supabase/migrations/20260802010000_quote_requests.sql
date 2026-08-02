-- Quote request lead capture (parallel to instant checkout; no payment)

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  room_type text,
  approx_rooms_or_guests text,
  approx_move_in text,
  approx_duration text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists quote_requests_created_idx
  on public.quote_requests (created_at desc);

alter table public.quote_requests enable row level security;

create policy quote_requests_anon_insert on public.quote_requests
  for insert
  to anon, authenticated
  with check (true);

create policy quote_requests_staff_select on public.quote_requests
  for select
  using (public.current_role() in ('owner', 'manager'));
