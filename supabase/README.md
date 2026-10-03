# Database foundation (local review candidate)

This slice leaves the running JSON app and UI unchanged. The current JSON files are a fixed input snapshot: there are no concurrent legacy writers to coordinate. The remaining path is schema setup → one validated import → Supabase client integration. There is no dual-write, ongoing sync, writer-freeze service, or reverse-sync implementation.

## Run locally

Use Node 20.19.2 (available in the development environment) or a compatible supported Node release. The host's default Node 16 cannot run the existing Vite/test dependencies.

```sh
npm ci
npm run test:migration
npm run db:import-json -- --source src/data --as-of 2026-10-03 --dry-run
npm run test:db
npm test
npm run lint
npm run build
```

`test:db` creates a uniquely named PostgreSQL 17.11 container using a pinned image digest, exposes an ephemeral **loopback-only** port, and removes its container/anonymous volume in `finally`. It uses trust authentication solely for that short-lived synthetic test instance. It accepts no database URL and never resets an existing database. Docker must be available. The test imports the fixed repository snapshot locally and prints counts, never journal notes. Interruptions such as SIGKILL may require removing the specifically labeled `fountain-pens.disposable=true` container.

The harness supplies minimal `auth.users`, `auth.uid()`, `anon`, and `authenticated` stand-ins; these are NOT part of shipped migrations. Real PostgreSQL constraints, roles, RLS, functions, locks, and transactions execute, but this is not a full Supabase Auth/PostgREST integration test. Rehearse against the approved nonproduction Supabase instance and run its advisors before cloud application. Do not infer provider/managed-role compatibility from a superuser-led vanilla PostgreSQL installation alone.

## Shipped boundary

- Relational inventory/events/ordered links, private owner configuration, import marker and mutation retry receipts. Text IDs and exact duplicate events survive; `NONE` becomes cleaning with zero links.
- RLS reads require the approved owner's Auth UUID. Clients cannot directly write domain/private tables. The non-login, non-BYPASSRLS `collection_writer` owns only narrow private command functions, not tables. Public wrappers use invoker rights; definer functions check the owner and have empty search paths. No cloud owner UUID is embedded.
- `set_pen_queue(request_id, pen_id, expected_version, needs_refill)`: a semantic no-op retains its version; a change increments once.
- `create_refill_event(request_id, entry)`, `update_refill_event(request_id, event_id, expected_version, entry)`, `delete_refill_event(request_id, event_id, expected_version)`: one atomic event/link/queue operation. Entry is a full replacement `{penId,date,kind,inkIds,notes,notPure}`. Create cleaning may additionally supply `queueAfterCleaning`. Edits increment once even for identical content and preserve sequence. Edits/deletes never alter queue intent. A newly latest eligible refill clears queue; a newly latest cleaning changes it only with an explicit choice. Same-day insertion wins.
- Owner is derived from Auth. Input cannot set IDs, sequence, versions, timestamps, or owner. Bigint outputs are strings. Caller generates a UUID request ID and reuses the same ID and payload only to resolve a lost response. The digest is SHA-256 of PostgreSQL's UTF-8 `jsonb::text` array representation documented in each function. Retry receipts have no automated pruning.
- One collection advisory lock `(17012026, 1)` serializes narrow commands and the one-time import. This is a database implementation detail, not an application transaction manager.

Stable error mapping for the later client adapter: `42501` forbidden (use session state to distinguish signed-out), `22023` validation, `P0002` not-found, `40001` conflict, `23503` referenced-record. Do not display raw database errors. Transport/unavailable handling and the final typed client adapter are next-slice work.

## One-time importer

`scripts/migration/legacy.mjs` shares validation/mapping between the dry-run and transactional operator library. Validation rejects unknown fields, invalid types/dates/colors, duplicate IDs/links, orphan references, mixed `NONE`, residual cleaning, NUL text, and invalid UTF-8. Future dates are review findings and block import. The supplied `asOf` is an explicit review date; runtime command dates use database time in America/Chicago.

The importer preserves strings and IDs, maps missing booleans to false/custom color to NULL, ignores legacy `index`, and assigns `legacy-refill-N` plus sequence N from actual array position. All inserts, field/ordered-relationship readback and the small import marker commit together. A matching source hash/owner/mapping/target marker makes a rerun a no-op, including after subsequent app edits; a mismatch or populated unmarked collection aborts. Sequence is advanced from the actual maximum, never a hard-coded count. Failed transactions may consume sequence numbers without losing rows.

The CLI deliberately exposes **dry-run only** in this chunk. The tested `importLegacy` library accepts an already authorized connection and explicit owner/target identity; it does not discover credentials or verify cloud identity itself. The next operator step must verify the approved target before supplying that connection. No production import, Auth bootstrap, credential configuration, Storage resource, or app cutover happened here.

Keep a backup copy of the fixed three JSON files before the authorized one-time import. Review the dry-run hashes/counts, apply reviewed migrations, establish the approved Auth owner separately, run import, and retain the reconciliation summary. Then integrate `supabase-js` reads/writes and remove JSON write paths in that later change. No restart/deploy/build triggers an import.

## Acceptance and decisions remaining

The fixed repository snapshot is 50 pens, 194 real inks, 486 events and 507 links; combined raw-file SHA-256 is `369692352fa2796aa7932ed7f87f3a5233291f8fd51c2751c9a8efdb1ca7aa58`. These counts are evidence for this snapshot, not hard-coded import rules.

Local tests cover clean base install, additive RPC migration over imported data, owner/stranger/anonymous access, direct table/private function authorization, deferred constraints, restrictive deletes, queue/version/replay semantics, injected partial-write failure, import reconciliation/reruns/mismatches, concurrent imports, rollback and sequence continuity. Pure fixture tests cover malformed input and duplicate/order preservation.

Before app integration: approve actual Supabase project/version and owner/provider, rehearse managed grants/RLS and real JWT/Data API calls, run advisors, generate database types, add a single-snapshot collection read contract and typed adapter, and complete inventory writes. Login provider remains undecided; this schema accepts an approved Auth UUID independently of email/OAuth provider. Media is deferred because there are no user photos to migrate. No extra text-length/taxonomy restrictions are imposed on historical data; select any future bounds with the UI validation work.
