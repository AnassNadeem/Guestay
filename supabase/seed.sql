-- Seed one clearly-marked TEST room for e2e / Anas content replacement.
-- Apply after init + phase2a_sot_repair.

insert into public.rooms (
  id, slug, name, category, tagline, description, long_description,
  capacity, bedrooms, bathrooms, size_sq_ft, beds,
  allows_shared_booking, allows_exclusive_booking, status, featured,
  cover_image_path, amenities, house_rules, sort_order
) values (
  'b1000000-0000-4000-8000-000000000001',
  'test-room',
  'TEST ROOM — replace via admin',
  'shared_bedroom',
  'Placeholder unit for end-to-end booking tests.',
  'Temporary test room. Replace content and photos via the admin Rooms page.',
  'This room exists so the guest booking flow can be verified against Supabase. Anas should archive or replace it with real inventory.',
  2, 1, 0, 180, 2, true, true, 'active', true,
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&q=80',
  array['wifi','ac','locker','kitchen'],
  array['Quiet hours from 10pm to 7am','No smoking indoors'],
  1
) on conflict (slug) do update set
  name = excluded.name,
  status = 'active',
  cover_image_path = excluded.cover_image_path;

delete from public.room_pricing
where room_id = 'b1000000-0000-4000-8000-000000000001';

insert into public.room_pricing (
  room_id, booking_mode,
  tier1_rate_pkr, tier2_rate_pkr, tier3_rate_pkr, tier4_rate_pkr,
  breakpoint_t2, breakpoint_t3, breakpoint_t4, security_deposit_pkr
) values
(
  'b1000000-0000-4000-8000-000000000001', 'shared',
  5000, 4000, 3500, 3000, 7, 15, 30, 10000
),
(
  'b1000000-0000-4000-8000-000000000001', 'exclusive',
  9000, 7650, 6750, 5850, 7, 15, 30, 15000
);
