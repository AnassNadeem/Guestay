-- Seed 5 units + pricing + promotions + ical tokens
-- Run after 20260728000000_init.sql

insert into public.rooms (
  id, slug, name, category, tagline, description, long_description,
  capacity, bedrooms, bathrooms, size_sq_ft, beds,
  allows_shared_booking, allows_exclusive_booking, status, featured,
  cover_image_path, amenities, house_rules, sort_order
) values
(
  'a1000000-0000-4000-8000-000000000001',
  'shared-bedroom-a',
  'Shared Bedroom A',
  'shared_bedroom',
  '3 beds with lockers — book a bed, or take the whole room.',
  'A 3-bed shared bedroom with personal lockers.',
  'Shared Bedroom A sleeps three. Book one bed or reserve exclusively.',
  3, 1, 0, 220, 3, true, true, 'active', true,
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&q=80',
  array['wifi','locker','ac','kitchen','lounge','laundry','utilities','cleaning'],
  array['Quiet hours from 10pm to 7am','No smoking indoors'],
  1
),
(
  'a1000000-0000-4000-8000-000000000002',
  'shared-bedroom-b',
  'Shared Bedroom B',
  'shared_bedroom',
  '4 beds — flexible for friends who want the room to themselves.',
  'Our largest shared bedroom with four beds.',
  'Shared Bedroom B has four beds with lockers and blackout curtains.',
  4, 1, 0, 280, 4, true, true, 'active', true,
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
  array['wifi','locker','ac','kitchen','lounge','laundry','utilities','cleaning'],
  array['Quiet hours from 10pm to 7am','No smoking indoors'],
  2
),
(
  'a1000000-0000-4000-8000-000000000003',
  'shared-bedroom-c',
  'Shared Bedroom C',
  'shared_bedroom',
  '3 beds — same flexible shared or exclusive options.',
  'A second 3-bed shared room.',
  'Shared Bedroom C mirrors Bedroom A.',
  3, 1, 0, 210, 3, true, true, 'active', true,
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1600&q=80',
  array['wifi','locker','ac','kitchen','lounge','laundry','utilities','cleaning'],
  array['Quiet hours from 10pm to 7am','No smoking indoors'],
  3
),
(
  'a1000000-0000-4000-8000-000000000004',
  'unfurnished-3br-flat',
  'Unfurnished 3-Bedroom Flat',
  'flat',
  '3 bedrooms, TV lounge, and kitchen — built for longer stays.',
  'Whole unfurnished flat for long-term rental.',
  'Three bedrooms, TV lounge, kitchen. Long-term oriented.',
  6, 3, 2, 1200, 0, false, true, 'active', true,
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
  array['wifi','kitchen','lounge','utilities','unfurnished'],
  array['No smoking indoors','Long-term stays preferred'],
  4
),
(
  'a1000000-0000-4000-8000-000000000005',
  'top-floor-2br-flat',
  'Top-Floor 2-Bedroom Flat',
  'flat',
  '2 bedrooms, lounge, kitchen, and roof access on the top floor.',
  'Top-floor flat with roof access.',
  'Two bedrooms, living/TV lounge, kitchen, roof access.',
  4, 2, 1, 900, 2, false, true, 'active', true,
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
  array['wifi','kitchen','lounge','rooftop','utilities','furnished'],
  array['No smoking indoors'],
  5
);

insert into public.room_pricing (
  room_id, booking_mode,
  tier1_rate_pkr, tier2_rate_pkr, tier3_rate_pkr, tier4_rate_pkr,
  security_deposit_pkr
) values
('a1000000-0000-4000-8000-000000000001', 'shared', 5000, 4000, 3500, 3000, 15000),
('a1000000-0000-4000-8000-000000000001', 'exclusive', 9000, 7650, 6750, 5850, 20000),
('a1000000-0000-4000-8000-000000000002', 'shared', 5000, 4000, 3500, 3000, 15000),
('a1000000-0000-4000-8000-000000000002', 'exclusive', 12000, 10200, 9000, 7800, 25000),
('a1000000-0000-4000-8000-000000000003', 'shared', 5000, 4000, 3500, 3000, 15000),
('a1000000-0000-4000-8000-000000000003', 'exclusive', 9000, 7650, 6750, 5850, 20000),
('a1000000-0000-4000-8000-000000000004', 'exclusive', 8000, 6800, 6000, 5200, 50000),
('a1000000-0000-4000-8000-000000000005', 'exclusive', 10000, 8500, 7500, 6500, 45000);

insert into public.promotions (kind, slug, title, headline, description, value, value_label, conditions, min_guests, active)
values
(
  'deposit_discount',
  'direct-booking-deposit',
  'Direct booking deposit credit',
  'Book with us directly. Keep 10% of your deposit.',
  'Skip marketplace markup. Direct bookings receive 10% off security deposit.',
  0.10,
  '10% off security deposit',
  '["Applies to direct bookings only","Cannot combine with group no-advance"]'::jsonb,
  null,
  true
),
(
  'group_no_advance',
  'group-ten-plus',
  'Groups of 10+',
  'Ten or more? Stay without an advance payment.',
  'Groups of 10+ can confirm without advance under group terms.',
  0,
  'No advance payment',
  '["Minimum 10 guests","Signed group agreement may apply"]'::jsonb,
  10,
  true
);

insert into public.ical_export_tokens (room_id)
select id from public.rooms;
