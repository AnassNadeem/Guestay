-- Public room image storage for admin uploads + storefront display.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-images',
  'room-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true;

-- Anyone can read public room images.
create policy "room_images_public_read"
on storage.objects for select
using (bucket_id = 'room-images');

-- Owners (and managers via staff role check in app) can upload via authenticated session.
-- RLS uses profiles.role when available; allow authenticated users who pass app-level gates.
create policy "room_images_authenticated_write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'room-images'
  and public.current_role() in ('owner', 'manager')
);

create policy "room_images_authenticated_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'room-images'
  and public.current_role() in ('owner', 'manager')
);

create policy "room_images_authenticated_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'room-images'
  and public.current_role() in ('owner', 'manager')
);
