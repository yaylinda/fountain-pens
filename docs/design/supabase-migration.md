# One-time JSON migration

The live app now uses Supabase. This document preserves the fixed import mapping and reproducibility procedure; it is not an instruction to import into the live collection. The source snapshot, importer and tests remain because they establish provenance and allow isolated schema/import rehearsals. See [current runtime](../../supabase/RUNTIME.md).

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

The three repository JSON files are a fixed snapshot, not current production data. Preserve their bytes and hashes. No ongoing sync or reverse migration exists.

## Reproducibility

Run `npm run db:import-json -- --source src/data --as-of 2026-10-03 --dry-run` to inspect hashes, validation findings and counts without a database connection. `npm run test:db` exercises the reusable importer against its own disposable database. The CLI intentionally supports only dry-run; no application build, startup or request imports data.

A new administrative import requires a separately approved empty target and owner. The importer commits rows, deferred constraints, field/link reconciliation and the source marker together; a matching rerun is a no-op, changed input or a populated unmarked target aborts. Do not replay this procedure against production. After live writes, recovery must preserve database changes rather than restore the old JSON app.

## Mapping and validation

Inventory IDs remain text. Missing optional booleans become false and absent custom colors become NULL. Preserve every accepted string and queue flag. Catalogs stay versioned reference data; no user-media backfill exists.

Source event at array position `i` becomes `legacy-refill-${i + 1}` with sequence `i + 1`, ignoring embedded `index`. Identical rows remain distinct events. `NONE`-only or empty ink arrays become cleaning; remove only the inventory sentinel. Real ink order is preserved in positions 0..n-1. Reject duplicate links, orphan references, mixed sentinel/real ink, residual-ink cleaning, invalid types/dates/colors and unknown fields. Future source dates are reported for review, never dropped.

The dry-run and import share one mapping implementation. Raw file bytes are hashed with ordered filename/hash pairs; the import marker records source hash, mapping version, owner, target, counts and validation context. Its purpose is only an accidental-rerun guard, not an import service or synchronization protocol.

## Acceptance

`npm run test:migration` validates source conversion and malformed fixtures. `npm run test:db` verifies fixed-source field/link reconciliation, matching rerun no-op, public reads beyond 1,000 rows, owner/stranger/anonymous permissions, ordinary CRUD, queue behavior and injected link failure rollback. These are synthetic/local tests, not a claim that every hosted recovery scenario is covered.

The historical [readiness record](../../supabase/operations/READINESS.md) retains reviewed SQL/source hashes and rehearsal evidence. Linda subsequently validated production login and updates manually. Preserve notes, custom swatches, catalog joins, favorites, archive flags, cleaning state, same-day order, histories and queue intent in future changes.
