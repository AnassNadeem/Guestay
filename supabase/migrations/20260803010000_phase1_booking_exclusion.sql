-- Phase 1 Â§4: close hold race at the database level
--
-- Inventory model: rooms are NOT per-bed rows. Bookings store beds_booked
-- (a count against rooms.capacity). booking_mode is shared | exclusive.
-- A naive EXCLUDE on room_id alone would incorrectly reject valid concurrent
-- shared bookings on the same room. Therefore:
--   1) GiST exclusion for exclusive (whole-room) bookings â€” matches the
--      atomic-room case in the audit.
--   2) Trigger that serializes writers per room and rejects shared
--      over-capacity and exclusiveâ†”shared overlaps, raising SQLSTATE 23P01
--      so app code can map all inventory conflicts to one guest message.

create extension if not exists btree_gist;

-- Exclusive bookings: at most one active exclusive hold/booking per room+dates
alter table public.bookings
  drop constraint if exists bookings_no_overlap_exclusive;

alter table public.bookings
  add constraint bookings_no_overlap_exclusive
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (
    status in (
      'pending_hold',
      'partially_paid',
      'paid',
      'confirmed_no_advance'
    )
    and booking_mode = 'exclusive'
  );

create or replace function public.enforce_booking_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_statuses public.booking_status[] := array[
    'pending_hold',
    'partially_paid',
    'paid',
    'confirmed_no_advance'
  ]::public.booking_status[];
  cap int;
  occupied int;
begin
  if not (new.status = any (active_statuses)) then
    return new;
  end if;

  -- Serialize concurrent inventory writers for this room
  perform 1 from public.rooms where id = new.room_id for update;
  select capacity into cap from public.rooms where id = new.room_id;
  if cap is null then
    raise exception 'Room not found for booking inventory check'
      using errcode = '23503';
  end if;

  if new.booking_mode = 'exclusive' then
    -- Exclusive claims the whole room â€” any overlapping active booking blocks it
    if exists (
      select 1
      from public.bookings b
      where b.room_id = new.room_id
        and b.id is distinct from new.id
        and b.status = any (active_statuses)
        and daterange(b.check_in, b.check_out, '[)')
          && daterange(new.check_in, new.check_out, '[)')
    ) then
      raise exception 'exclusion_violation: room unavailable for these dates'
        using errcode = '23P01';
    end if;
  else
    -- Shared: cannot overlap an exclusive booking
    if exists (
      select 1
      from public.bookings b
      where b.room_id = new.room_id
        and b.id is distinct from new.id
        and b.status = any (active_statuses)
        and b.booking_mode = 'exclusive'
        and daterange(b.check_in, b.check_out, '[)')
          && daterange(new.check_in, new.check_out, '[)')
    ) then
      raise exception 'exclusion_violation: room unavailable for these dates'
        using errcode = '23P01';
    end if;

    -- Shared capacity: sum beds_booked of overlapping shared/active bookings
    select coalesce(sum(b.beds_booked), 0)::int
      into occupied
    from public.bookings b
    where b.room_id = new.room_id
      and b.id is distinct from new.id
      and b.status = any (active_statuses)
      and b.booking_mode = 'shared'
      and daterange(b.check_in, b.check_out, '[)')
        && daterange(new.check_in, new.check_out, '[)');

    if occupied + new.beds_booked > cap then
      raise exception 'exclusion_violation: room unavailable for these dates'
        using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_inventory_trg on public.bookings;
create trigger bookings_enforce_inventory_trg
  before insert or update of room_id, check_in, check_out, beds_booked,
    booking_mode, status
  on public.bookings
  for each row
  execute function public.enforce_booking_inventory();
