# Rollback runbook

## Workers (storefront + admin)

Cloudflare keeps versioned deployments. Rolling back creates a **new** active deployment that points at a prior version — it does not delete history.

### Storefront (`guestay-web` → guestay.pk)

```bash
# See recent versions
npx wrangler versions list --name guestay-web
# Or recent deployments:
npx wrangler deployments list --name guestay-web

# Roll back to the previous version (interactive confirm)
npx wrangler rollback --name guestay-web -m "rollback bad production deploy"

# Or pin an exact version id from the list above
npx wrangler rollback <VERSION_ID> --name guestay-web -m "rollback to known-good" -y
```

Production env (same Worker name, production routes in `wrangler.toml`):

```bash
npx wrangler rollback --name guestay-web --env production -m "rollback production" -y
```

### Admin (`guestay-admin` → admin.guestay.pk)

```bash
npx wrangler versions list --name guestay-admin
npx wrangler rollback --name guestay-admin -m "rollback bad admin deploy" -y
# From the admin package directory (uses admin/wrangler.toml):
npm --prefix admin exec -- wrangler rollback -m "rollback bad admin deploy" -y
```

### Cron / OTA workers

```bash
npx wrangler rollback --name guestay-bookings-cron -m "rollback cron" -y
npx wrangler rollback --name guestay-ota-sync -m "rollback ota" -y
```

Dashboard alternative: Cloudflare → Workers & Pages → select Worker → Deployments → ⋯ on a prior version → **Rollback**.

Limits: only the **100** most recent versions are eligible. Bindings that were deleted/changed since that version can block a rollback.

---

## Database migrations — not roll-backable

This project’s Supabase migrations under `supabase/migrations/` are **forward-only**. There are no down-migrations.

If a bad migration ships:

1. Do **not** expect `wrangler rollback` (or redeploying an old Worker) to undo schema/data changes.
2. Write a **new** forward migration that corrects the mistake (add/drop/alter as needed).
3. Apply it with the usual migration path (`supabase db push` / hosted migration apply).
4. Then redeploy app code that matches the corrected schema.

A Worker rollback only reverts **application code** on Cloudflare. Schema and data in Supabase stay where the last migration left them.
