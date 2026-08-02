-- Admin in-app notifications (bell + /notifications page)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'general',
  title text not null,
  body text not null default '',
  href text,
  meta jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (is_read, created_at desc)
  where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists notifications_staff_select on public.notifications;
create policy notifications_staff_select on public.notifications
  for select using (public.current_role() in ('owner', 'manager'));

drop policy if exists notifications_staff_update on public.notifications;
create policy notifications_staff_update on public.notifications
  for update using (public.current_role() in ('owner', 'manager'));

drop policy if exists notifications_staff_delete on public.notifications;
create policy notifications_staff_delete on public.notifications
  for delete using (public.current_role() in ('owner', 'manager'));

drop policy if exists notifications_owner_insert on public.notifications;
create policy notifications_owner_insert on public.notifications
  for insert with check (public.current_role() in ('owner', 'manager'));

-- Staff suspend flag (Users page)
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

-- Strengthen rooms public read (anon/authenticated explicitly)
grant select on public.rooms to anon, authenticated;
grant select on public.room_pricing to anon, authenticated;
grant select on public.room_images to anon, authenticated;

drop policy if exists rooms_public_read on public.rooms;
create policy rooms_public_read on public.rooms for select using (
  status = 'active'
  or public.current_role() in ('owner', 'manager')
);

-- Backfill orphan auth users missing profiles (fixes refund guest_id FK)
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, u.id::text || '@guestay.local'),
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, 'Guest'), '@', 1)),
  'guest'::public.user_role
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
