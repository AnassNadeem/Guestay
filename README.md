# Guestay

Marketing + booking-flow frontend for **Guestay** — *Shared Spaces, Better Living.*

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Framer Motion, GSAP ScrollTrigger
- react-three-fiber / drei (homepage 3D mark)
- Typed mock data shaped for a future Supabase swap

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Hero + 3D mark, search UI, featured rooms, amenities, testimonials |
| `/rooms` | Client-side filters + room grid |
| `/rooms/[slug]` | Gallery, details, sticky quote card |
| `/promotions` | Direct-booking deposit credit + group offer |
| `/about` | Story, values, location, team |
| `/contact` | Form (local), map placeholder, FAQ |
| `404` | On-brand not found |

## Brand tokens

Sampled from `public/logo.png`:

- Olive `#4D503B`
- Sage `#A1A580`
- Cream `#DDDED0`

## Mock data

`src/types` + `src/lib/mock` — replace fetchers with Supabase without rewriting UI.
