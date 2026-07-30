-- Phase 2B: account profile fields, name-change requests, cart↔hold link

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists legal_name text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists date_of_birth date;

-- Backfill legal_name / display_name from full_name where missing
update public.profiles
set
  legal_name = coalesce(legal_name, full_name),
  display_name = coalesce(display_name, full_name)
where full_name is not null;

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

alter table public.bookings
  add column if not exists cart_item_id text;

alter table public.name_change_requests enable row level security;

create policy name_change_own_read on public.name_change_requests
  for select using (auth.uid() = user_id);

create policy name_change_own_insert on public.name_change_requests
  for insert with check (auth.uid() = user_id);

create policy name_change_own_update_pending on public.name_change_requests
  for update using (
    auth.uid() = user_id and status = 'pending'
  );

create policy name_change_staff_read on public.name_change_requests
  for select using (
    public.current_user_role() in ('owner', 'manager')
  );

create policy name_change_owner_decide on public.name_change_requests
  for update using (
    public.current_user_role() = 'owner'
  );

-- Keep handle_new_user in sync with new columns when present
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_full text := coalesce(new.raw_user_meta_data->>'full_name', '');
  meta_first text := coalesce(new.raw_user_meta_data->>'first_name', '');
  meta_last text := coalesce(new.raw_user_meta_data->>'last_name', '');
  meta_display text := coalesce(new.raw_user_meta_data->>'display_name', '');
  meta_phone text := coalesce(new.raw_user_meta_data->>'phone', '');
  computed_legal text;
begin
  computed_legal := nullif(trim(meta_full), '');
  if computed_legal is null and (meta_first <> '' or meta_last <> '') then
    computed_legal := trim(meta_first || ' ' || meta_last);
  end if;

  insert into public.profiles (
    id, email, full_name, display_name, legal_name, phone, role
  )
  values (
    new.id,
    new.email,
    computed_legal,
    coalesce(nullif(meta_display, ''), computed_legal),
    computed_legal,
    nullif(meta_phone, ''),
    'guest'
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;
