> Historical design: runtime access and mutation requirements are superseded by [the public-read, owner-only CRUD contract](../../supabase/RUNTIME.md). Do not implement the earlier conflict, retry receipt or private-browsing proposals.

# One-time JSON migration

Implementation status and executable commands are in [supabase/README.md](../../supabase/README.md). This runbook supersedes the original stopped-writer/cutover choreography: the user confirmed the JSON source is fixed while the database and application are rewritten.

## Source audit

The design branch at `e271b7b` contains the September 19 snapshot: 49 pens, 194 real inks plus `NONE`, 483 journal events, 504 real links, 29 cleanings, 38 mixtures, 18 residual-ink events, and 32 same-pen/day groups. Its suggested next sequence 484 applies only to that snapshot.

Read-only inspection of local `main` at `9256ece38eab7490633682d4630cf603e1178d13` on 2026-10-03 yields:

| Observation | Snapshot result |
| --- | --- |
| Pens / ink rows | 50 / 195 (194 real inks + `NONE`) |
| Journal | 486 events: 457 refills + 29 cleanings |
| Links / mixtures | 507 real event-ink links / 38 multi-ink entries |
| Residual ink | 18 `notPure` events |
| Date range | 2024-10-04 through 2026-10-02 |
| Same-pen/day groups | 33 |
| Legacy embedded `index` | 81 rows; never authoritative ordering |
| Exact repeat rows beyond first | 2; preserve as distinct events |
| Non-UUID inventory IDs | 43 pens / 110 real inks |
| Catalog records | 15 Pilot / 21 Wearingeul |
| Next sequence for this snapshot only | 487; derive from actual imported maximum |

The user confirmed that JSON will not change during the rewrite. Treat the current repository files as the fixed source snapshot, retain a backup, and compare their raw hashes before the one-time import. No live-writer coordination, ongoing sync, or reverse migration is required.

## Simple delivery sequence

1. Review the schema and locally tested migrations; confirm the Supabase target and approved Auth owner. Hosting remains Vercel, database/storage Supabase, access private, journal dates America/Chicago. Login provider is still a separate choice.
2. Retain a backup of `pens.json`, `inks.json`, and `refillLog.json`. Run the dry-run over these fixed files and review validation findings, raw file hashes and counts. No build, startup or web request imports data.
3. Apply reviewed migrations to the approved empty target; establish the owner through a separately authorized administrative action. Rehearse managed roles/RLS and real Auth/Data API behavior first. Local tests use a disposable PostgreSQL 17.11 instance, not a full Supabase stack.
4. Run the one-time importer through an authorized operator connection. Require the explicit owner and verified target. All rows, deferred constraints, full field/link readback and a small source-hash marker commit in one transaction. A matching rerun is a no-op; changed input or a populated unmarked target aborts. There is no upsert into an active collection.
5. Integrate `supabase-js` reads and writes, using narrow transactional RPCs for multi-ink events and their pen queue effect. Preserve the existing UI until that integration is deliberately switched. Remove obsolete JSON write/Git sync paths in that change.
6. Verify app workflows, owner authorization, failure/conflict handling and deployment checks, then release to Vercel through the agreed deployment workflow. Keep the backup and import summary for reference. Once database writes begin, restoring the old JSON application would discard new writes; use database recovery or a compatible app rollback instead. No automated reverse sync is planned.

## Mapping and validation

Inventory IDs remain text. Missing optional booleans become false and absent custom colors become NULL. Preserve every accepted string and queue flag. Catalogs stay versioned reference data; no user-media backfill exists.

Source event at array position `i` becomes `legacy-refill-${i + 1}` with sequence `i + 1`, ignoring embedded `index`. Identical rows remain distinct events. `NONE`-only or empty ink arrays become cleaning; remove only the inventory sentinel. Real ink order is preserved in positions 0..n-1. Reject duplicate links, orphan references, mixed sentinel/real ink, residual-ink cleaning, invalid types/dates/colors and unknown fields. Future source dates are reported for review, never dropped.

The dry-run and import share one mapping implementation. Raw file bytes are hashed with ordered filename/hash pairs; the import marker records source hash, mapping version, owner, target, counts and validation context. Its purpose is only an accidental-rerun guard, not an import service or synchronization protocol.

## Acceptance

`npm run test:migration` validates synthetic edge cases. `npm run test:db` creates/removes its own disposable database and verifies exact fields/relationships, duplicate/order preservation, constraints, repeated no-op, source/owner mismatch, populated-target rejection, concurrent import serialization, rollback after partial insertion and sequence continuation. It also tests owner/stranger/anonymous SQL permissions, command versions/retry receipts, queue behavior and injected link failure rollback.

The current CLI supports `--dry-run`; cloud execution intentionally awaits the approved target and operator connection. Before real import, complete Supabase-specific role/JWT/Data API/advisor checks and target verification. During client integration, add the typed read adapter, derived-view parity and existing UI workflow tests. Preserve notes, custom swatches, catalog joins, favorites, archive flags, cleaning state, same-day order, histories and queue intent.
