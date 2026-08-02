-- Stamp when a payment actually succeeded (distinct from created_at = initiated).

alter table public.payments
  add column if not exists paid_at timestamptz;

-- Backfill: treat succeeded rows as paid at creation time.
update public.payments
set paid_at = created_at
where status = 'succeeded'
  and paid_at is null;

create index if not exists payments_paid_at_idx
  on public.payments (paid_at desc)
  where paid_at is not null;
