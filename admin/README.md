# Guestay Admin (Refine) — admin.guestay.pk

Separate staff app. Run locally:

```bash
cd admin
npm install
npm run dev
```

Opens on http://localhost:3001

## Dev seed logins (never against production)

| Role    | Email                 | Password         |
|---------|-----------------------|------------------|
| Owner   | owner@guestay.test    | OwnerDemo#2026   |
| Manager | manager@guestay.test  | ManagerDemo#2026 |

## Env (`admin/.env`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SITE_URL=http://localhost:3000
```

When Supabase is unset, the app uses a local mock data provider so UI can be tested independently.

## Features

- Dashboard KPIs
- Bookings CRM + CSV export
- Rooms (tiers, soft-delete)
- Dual calendars (heatmap + timeline by source)
- Guests CRM
- Analytics charts
- Refund requests (Owner approve/deny)
- Staff/Users (Owner only)
- OTA sync monitor + Force Resync
- Walk-in form → main site `/api/admin/walk-in`
