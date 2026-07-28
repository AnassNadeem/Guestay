# Guestay

Coliving booking product — *Shared Spaces, Better Living.*

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Framer Motion / GSAP
- Supabase (schema in `supabase/`) — optional until credentials are set
- Safepay payment gateway adapter (`src/lib/payments`)
- Cloudflare Workers (`workers/`) for email, hold expiry, OTA/iCal

## Develop

```bash
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: [http://localhost:3000/admin](http://localhost:3000/admin).

Without Supabase/Safepay keys, bookings use an in-memory store and a mock payment redirect so you can test the full checkout flow locally.

## Apply database

1. Create a Supabase project.
2. Run `supabase/migrations/20260728000000_init.sql` then `supabase/seed.sql` in the SQL editor.
3. Fill `.env.local` Supabase keys and set `OWNER_BOOTSTRAP_EMAIL`.

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Marketing home |
| `/rooms`, `/rooms/[slug]` | Unit inventory + live quote |
| `/checkout` | Single-page checkout + 2h hold |
| `/booking/[reference]` | Confirmation |
| `/account`, `/login` | Guest magic-link account |
| `/promotions`, `/terms`, `/privacy`, `/cancellation` | Offers + legal |
| `/admin` | Staff CRM, calendar, walk-in, OTA, analytics |

## Brand

Ink `#3B4430` · Sage `#A6AC7E` · Cream `#E7E7D6` · Space Grotesk + Inter + JetBrains Mono
