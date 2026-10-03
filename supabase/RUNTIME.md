# Supabase runtime

Anyone can browse pens, inks, history and displayed journal notes. Only Linda's approved Auth UUID in `private.collection_owner` can write. There is no public signup UI. Email/password is the minimum supported sign-in provider; account creation and binding belong to hosted setup.

## Configuration

Use Node 22.16.0 or Node 20.19+. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time. Never expose secret/service-role keys. The pinned Supabase browser client uses its normal persisted Auth session. JSON source files are offline importer inputs, never a runtime fallback.

## Database contract

`get_collection()` returns one public JSON snapshot with pens, inks, events, ordered ink links, Chicago `asOf` and boolean `canEdit`. Aggregating into one row avoids PostgREST's row limit truncating inventory. Bigint sequences remain strings and determine same-day ordering. Stable event IDs identify journal routes.

Inventory RPCs are `create_pen(p_item)`, `update_pen(p_id,p_item)`, `delete_pen(p_id)` and equivalent ink commands. Archive and restore are ordinary updates. Foreign keys prevent deleting referenced inventory: archive it instead.

Refill RPCs are `create_refill_event(p_entry)`, `update_refill_event(p_event_id,p_entry)`, and `delete_refill_event(p_event_id)`. Entry fields are `{penId,date,kind,inkIds,notes,notPure}`; cleaning creates may include `queueAfterCleaning`. Events and ordered links commit in one transaction. A newly latest eligible refill clears the queue; a newly latest cleaning changes it only with an explicit choice. Historical edits/deletes do not change queue intent.

Public wrappers and private mutation helpers use invoker rights. Authenticated DML grants are constrained by forced owner RLS; anonymous and non-owner accounts can only read public domain tables. The sole definer helper, `private.is_owner`, returns a boolean and has an empty search path. Its owner is the migration operator. Private owner/import tables are not readable by the browser. No custom writer role or delegation of Auth grants is required.

The application has straightforward CRUD and ordinary pending/error states. Rejected saves keep the current form draft. A confirmed write whose refresh fails stays visible with a saved/refresh warning. There are no expected versions, runtime receipts, automatic write replay, advisory locks, or session-preserved draft registries. Nested form navigation still keeps ordinary in-memory drafts.

## Migration history

The three versioned SQL migrations are the deployed schema history. Keep them unchanged; add reviewed migrations for future schema changes. The foundations were revised before first hosted deployment to avoid custom-role ownership and delegated Auth grants incompatible with managed permissions. That is historical rationale, not an instruction to replace deployed migrations.

## Evidence and remaining verification

`npm test` uses the actual pinned browser client with synthetic HTTP/Auth responses and exercises public browse, owner sign-in, ordinary errors, inventory, drafts, journal and queue behavior. `npm run test:db` uses disposable PostgreSQL 17.11 with a non-superuser migration operator and Auth privileges without grant option. It checks fresh installation, public/owner/stranger authorization, inventory CRUD/archive/delete, ordered multi-ink transactions and rollback, fixed import reconciliation, and snapshots larger than 1,000 rows.

These tests do not prove hosted Auth JWT/PostgREST/schema-cache behavior. Linda manually validated production login and updates after the rearchitecture. Future runtime changes still require appropriate hosted verification. GitHub Actions owns Vercel releases after the exact-SHA schema gate; Supabase integration owns schema deployment. See [operations](../docs/deployment.md). This cleanup does not change a live host or database.
