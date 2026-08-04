# Guestay Admin (Refine) — https://admin.guestay.pk

Separate staff SPA. Local:

```bash
cd admin
npm install
npm run dev
```

Opens on http://localhost:3001

## Production deploy

From repo root (needs Wrangler auth + DNS for guestay.pk on Cloudflare):

```bash
# Bake production API origin into the SPA, then deploy Worker Assets
$env:VITE_SITE_URL="https://guestay.pk"   # PowerShell
npm run deploy:admin
```

Custom domain `admin.guestay.pk` is declared in `admin/wrangler.toml`.

Also set on the **main site** Worker:

- `NEXT_PUBLIC_ADMIN_URL=https://admin.guestay.pk`

And in **Supabase → Authentication → URL Configuration**, allow:

- `https://admin.guestay.pk`
- `https://admin.guestay.pk/**` (redirect URLs if prompted)

## Env (`admin/.env.local`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SITE_URL=http://localhost:3000
```

Production builds must use `VITE_SITE_URL=https://guestay.pk` so staff APIs hit the live site.

## Roles

| UI label | DB role  | Access                                      |
|---------|----------|---------------------------------------------|
| Admin   | `owner`  | Full (revenue, analytics, staff, refunds)   |
| Manager | `manager`| Bookings, calendar, rooms view, walk-in, OTA|

## Features

- Dashboard KPIs
- Idle session timeout (5 min quiet → 60s continue warning → logout)
- Bookings CRM + CSV export
- Rooms (tiers, soft-delete)
- Dual calendars
- Guests CRM
- Analytics charts
- Refund requests (Admin approve/deny)
- Staff/Users (Admin only) — invite email, edit, activate/deactivate, delete, view
- OTA sync monitor + Force Resync
- Walk-in form → main site `/api/admin/walk-in`
