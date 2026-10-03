# Implemented collection schema

The source of truth is the three ordered files in `supabase/migrations`. They are applied history and must not be rewritten. CI rehearses fresh installation on disposable PostgreSQL 17.11 with a non-superuser migration owner and managed-like Auth grants.

| Table | Purpose and constraints |
| --- | --- |
| `private.collection_owner` | Single approved Auth UUID and America/Chicago timezone; clients cannot read or modify it. |
| `private.data_imports` | One-time source hash, mapping version and reconciliation manifest; private audit/rerun guard, not runtime mutation receipts. |
| `public.pens` | Text ID, owner, brand/model/finish/nib fields, archive/favorite/refill flags and timestamps. |
| `public.inks` | Text ID, owner, brand/collection/name, optional six-digit hex color, archive/favorite flags and timestamps. `NONE` is forbidden. |
| `public.refill_events` | Stable text ID, owner, pen, calendar date, refill/cleaning kind, notes, residual-ink flag, bigint ordering sequence and timestamps. |
| `public.refill_event_inks` | Ordered event/ink links with unique event+ink and event+position; positions are contiguous from zero. |

Composite owner foreign keys preserve relationships. Referenced pens/inks cannot be deleted; archive them instead. Deleting an event cascades its links. Deferred constraints require a refill to have ink links and a cleaning to have none. Cleaning cannot have residual ink. There are no version columns, mutation receipt tables, media tables or custom writer roles.

## Access and transactions

All four public tables have forced RLS. Public SELECT is intentional, including displayed journal notes. Authenticated DML grants are restricted by policies requiring the approved owner and matching `owner_id`; anonymous and other users cannot write. Both private tables have RLS and no browser table privileges.

`private.is_owner()` is the sole SECURITY DEFINER helper. It returns only a boolean, has an empty search path and is owned by the migration operator. Snapshot and mutation functions run with invoker rights. RPC checks and RLS enforce access; UI `canEdit` is not a security boundary.

Inventory create/update/delete RPCs validate fields and return saved items. Refill create/update/delete RPCs commit events, ordered links and queue effects together. A new latest eligible refill clears the queue; a new latest cleaning changes it only when explicitly requested. Historical edits/deletions leave queue intent unchanged. Future events remain in history but do not change today's pairing. Chicago calendar dates and sequence order determine the current pairing.

The journal stores the current edited record, not a revision audit log. There is no optimistic conflict protocol or automatic replay. See [exact RPC payloads and behavior](../../supabase/RUNTIME.md).

## Verification

`npm run test:db` checks fresh migration installation, public reads, anonymous/stranger write denial, owner CRUD, archive/restore, restrictive deletes, ordered multi-ink writes, transaction rollback, fixed-source reconciliation and reads above 1,000 rows. It uses synthetic Auth claims and does not replace hosted login/PostgREST verification. Linda manually validated production login and updates following the rearchitecture.
