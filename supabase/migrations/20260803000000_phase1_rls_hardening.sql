-- Phase 1: Lock the Doors — RLS privilege-escalation fixes
-- 1a. profiles.role cannot be self-escalated via client UPDATE
-- 1b. name_change_requests: guests may only cancel their own pending request
-- 1c. quote_requests: keep public INSERT; confirm no anon UPDATE/DELETE

-- ---------------------------------------------------------------------------
-- 1a. profiles — freeze role on self-update
-- Owners still manage roles via profiles_owner_all (and service-role seeds).
-- ---------------------------------------------------------------------------
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 1b. name_change_requests — guests may cancel pending only
-- ---------------------------------------------------------------------------
alter table public.name_change_requests
  drop constraint if exists name_change_requests_status_check;

alter table public.name_change_requests
  add constraint name_change_requests_status_check
  check (status in ('pending', 'approved', 'denied', 'cancelled'));

drop policy if exists name_change_own_update_pending on public.name_change_requests;

create policy name_change_own_update_pending on public.name_change_requests
  for update
  using (
    auth.uid() = user_id
    and status = 'pending'
  )
  with check (
    auth.uid() = user_id
    and status = 'cancelled'
    and reviewer_id is null
    and reviewer_note is null
    and decided_at is null
  );

-- Owner decide path unchanged (name_change_owner_decide) — service/owner JWT.

-- ---------------------------------------------------------------------------
-- 1c. quote_requests — public INSERT stays; no staff-only columns exist yet.
-- No UPDATE/DELETE policies for anon/authenticated → denied under RLS.
-- Tighten INSERT WITH CHECK to require the public lead fields.
-- ---------------------------------------------------------------------------
drop policy if exists quote_requests_anon_insert on public.quote_requests;

create policy quote_requests_anon_insert on public.quote_requests
  for insert
  to anon, authenticated
  with check (
    name is not null
    and length(trim(name)) > 0
    and email is not null
    and length(trim(email)) > 0
    and phone is not null
    and length(trim(phone)) > 0
  );

-- Force server-controlled identity/timestamps so clients cannot forge them.
create or replace function public.quote_requests_force_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists quote_requests_force_defaults_trg on public.quote_requests;
create trigger quote_requests_force_defaults_trg
  before insert on public.quote_requests
  for each row
  execute function public.quote_requests_force_defaults();
