-- Guestay schema: rooms, pricing, bookings, payments, OTA, audit
-- Apply via: supabase db push / SQL editor

create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'manager', 'guest');
create type public.room_category as enum ('shared_bedroom', 'private_room', 'flat');
create type public.room_status as enum ('active', 'under_development', 'archived');
create type public.booking_mode as enum ('shared', 'exclusive');
create type public.booking_source as enum ('direct', 'airbnb', 'booking_com', 'walk_in');
create type public.booking_status as enum (
  'pending_hold',
  'partially_paid',
  'paid',
  'confirmed_no_advance',
  'cancelled',
  'completed',
  'expired_hold'
);
create type public.payment_kind as enum ('deposit', 'full', 'balance', 'manual_cash');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.ota_provider as enum ('airbnb', 'booking_com');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role public.user_role not null default 'guest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category public.room_category not null,
  tagline text not null default '',
  description text not null default '',
  long_description text not null default '',
  capacity int not null check (capacity > 0),
  bedrooms int not null default 1,
  bathrooms int not null default 0,
  size_sq_ft int,
  beds int not null default 0,
  allows_shared_booking boolean not null default false,
  allows_exclusive_booking boolean not null default true,
  status public.room_status not null default 'active',
  cover_image_path text,
  amenities text[] not null default '{}',
  house_rules text[] not null default '{}',
  sort_order int not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order int not null default 0
);

create table public.room_pricing (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  booking_mode public.booking_mode not null,
  tier1_rate_pkr int not null,
  tier2_rate_pkr int not null,
  tier3_rate_pkr int not null,
  tier4_rate_pkr int not null,
  breakpoint_t2 int not null default 7,
  breakpoint_t3 int not null default 15,
  breakpoint_t4 int not null default 30,
  security_deposit_pkr int not null default 0,
  currency text not null default 'PKR',
  unique (room_id, booking_mode)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  slug text not null unique,
  title text not null,
  headline text not null,
  description text not null,
  value numeric not null default 0,
  value_label text,
  conditions jsonb not null default '[]',
  min_guests int,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  room_id uuid not null references public.rooms (id),
  guest_id uuid references public.profiles (id),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  guest_count int not null default 1,
  booking_mode public.booking_mode not null,
  beds_booked int not null,
  check_in date not null,
  check_out date not null,
  nights int not null,
  source public.booking_source not null default 'direct',
  status public.booking_status not null default 'pending_hold',
  tier_applied int not null check (tier_applied between 1 and 4),
  rate_per_night_pkr int not null,
  subtotal_pkr int not null,
  deposit_list_pkr int not null default 0,
  deposit_discount_pkr int not null default 0,
  deposit_due_pkr int not null default 0,
  amount_paid_pkr int not null default 0,
  amount_due_pkr int not null default 0,
  total_pkr int not null,
  hold_expires_at timestamptz,
  is_group_no_advance boolean not null default false,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  check (beds_booked > 0)
);

create index bookings_room_dates_idx on public.bookings (room_id, check_in, check_out);
create index bookings_status_idx on public.bookings (status);
create index bookings_guest_idx on public.bookings (guest_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.payment_kind not null,
  amount_pkr int not null,
  status public.payment_status not null default 'pending',
  gateway text not null default 'safepay',
  gateway_tracker text,
  gateway_payload jsonb,
  created_at timestamptz not null default now()
);

create table public.ota_feeds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  provider public.ota_provider not null,
  ical_url text not null,
  last_synced_at timestamptz,
  last_sync_status text,
  last_error text,
  active boolean not null default true,
  unique (room_id, provider)
);

create table public.ota_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  source public.booking_source not null,
  start_date date not null,
  end_date date not null,
  external_uid text not null,
  raw jsonb,
  unique (room_id, source, external_uid)
);

create table public.ical_export_tokens (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  table_name text not null,
  row_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending',
  attempts int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Occupancy helper: beds occupied for overlapping blocking bookings
create or replace function public.beds_occupied(
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_exclude_booking uuid default null
) returns int
language sql
stable
as $$
  select coalesce(sum(b.beds_booked), 0)::int
  from public.bookings b
  where b.room_id = p_room_id
    and b.status in ('pending_hold', 'partially_paid', 'paid', 'confirmed_no_advance')
    and (b.status <> 'pending_hold' or b.hold_expires_at > now())
    and b.check_in < p_check_out
    and b.check_out > p_check_in
    and (p_exclude_booking is null or b.id <> p_exclude_booking);
$$;

create or replace function public.ota_beds_blocked(
  p_room_id uuid,
  p_check_in date,
  p_check_out date
) returns int
language sql
stable
as $$
  select case when exists (
    select 1 from public.ota_blocks o
    where o.room_id = p_room_id
      and o.start_date < p_check_out
      and o.end_date > p_check_in
  ) then (
    select capacity from public.rooms where id = p_room_id
  ) else 0 end;
$$;

-- Audit trigger on bookings
create or replace function public.audit_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
begin
  select email into v_email from public.profiles where id = v_actor;
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, actor_email, action, table_name, row_id, before, after)
    values (v_actor, v_email, 'insert', 'bookings', new.id::text, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (actor_id, actor_email, action, table_name, row_id, before, after)
    values (v_actor, v_email, 'update', 'bookings', new.id::text, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (actor_id, actor_email, action, table_name, row_id, before, after)
    values (v_actor, v_email, 'delete', 'bookings', old.id::text, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

create trigger bookings_audit
after insert or update or delete on public.bookings
for each row execute function public.audit_bookings();

-- Profile bootstrap on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'guest'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.room_pricing enable row level security;
alter table public.promotions enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.ota_feeds enable row level security;
alter table public.ota_blocks enable row level security;
alter table public.ical_export_tokens enable row level security;
alter table public.audit_log enable row level security;
alter table public.email_outbox enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest'::public.user_role);
$$;

-- profiles
create policy profiles_select_own on public.profiles for select using (
  id = auth.uid() or public.current_role() in ('owner', 'manager')
);
create policy profiles_update_own on public.profiles for update using (
  id = auth.uid() or public.current_role() = 'owner'
);
create policy profiles_owner_all on public.profiles for all using (
  public.current_role() = 'owner'
);

-- rooms public read active
create policy rooms_public_read on public.rooms for select using (
  status = 'active' or public.current_role() in ('owner', 'manager')
);
create policy rooms_owner_write on public.rooms for all using (
  public.current_role() = 'owner'
);

create policy room_images_read on public.room_images for select using (true);
create policy room_images_owner on public.room_images for all using (
  public.current_role() = 'owner'
);

create policy room_pricing_read on public.room_pricing for select using (true);
create policy room_pricing_owner on public.room_pricing for all using (
  public.current_role() = 'owner'
);

create policy promotions_read on public.promotions for select using (
  active or public.current_role() in ('owner', 'manager')
);
create policy promotions_owner on public.promotions for all using (
  public.current_role() = 'owner'
);

create policy bookings_guest_read on public.bookings for select using (
  guest_id = auth.uid() or public.current_role() in ('owner', 'manager')
);
create policy bookings_staff_write on public.bookings for all using (
  public.current_role() in ('owner', 'manager')
);

create policy payments_read on public.payments for select using (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.guest_id = auth.uid() or public.current_role() in ('owner', 'manager'))
  )
);
create policy payments_staff on public.payments for all using (
  public.current_role() in ('owner', 'manager')
);

create policy ota_staff on public.ota_feeds for all using (
  public.current_role() in ('owner', 'manager')
);
create policy ota_blocks_staff on public.ota_blocks for all using (
  public.current_role() in ('owner', 'manager')
);
create policy ical_tokens_staff on public.ical_export_tokens for all using (
  public.current_role() in ('owner', 'manager')
);

create policy audit_owner_read on public.audit_log for select using (
  public.current_role() = 'owner'
);

create policy email_outbox_staff on public.email_outbox for all using (
  public.current_role() in ('owner', 'manager')
);
