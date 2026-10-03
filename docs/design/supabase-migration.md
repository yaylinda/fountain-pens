# JSON migration and safe cutover

Status: proposed runbook, executable work only after [schema approval](client-api-postgres.md#direction-and-decision-gates). Schema SQL, one-time import, and synthetic development seeds are separate operations. No runtime startup/build/deployment may automatically import collection JSON.

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

These files are not a verified capture of the live mounted JSON directory. A branch SHA does not include uncommitted runtime changes. Re-audit during rehearsal and again after stopping **all** live writers; never hard-code these counts as production acceptance criteria. Audit duplicate IDs, orphan references, dates, booleans, colors, mixed `NONE`/real inks, duplicate links, unknown fields, and reference associations. Stop on unexplained anomalies instead of repairing them opportunistically.

## Versioned schema migrations

After Gate A, check the installed CLI version, current official guidance, and relevant `supabase <command> --help` before using commands. Create migration filenames with `supabase migration new <description>` and commit reviewed SQL in `supabase/migrations/<timestamp>_<description>.sql`. Include table constraints, indexes, grants, RLS, function ownership/EXECUTE privileges, triggers, and any approved Storage policies. Generate TypeScript database types from that version; keep explicit DTO conversion separate. Use the Supabase CLI's tracked migrations; do not introduce a second ORM migration authority or production schema push outside review. [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations).

Test a clean local install and upgrade from the prior supported schema using disposable data. Run SQL/role tests under realistic `anon`, authenticated owner, authenticated stranger, and mutation roles. Review generated diffs and all destructive statements. Run the available Supabase security/performance advisors against authorized nonproduction targets during implementation, review findings, and resolve applicable issues before release; advisors complement rather than replace role/constraint tests. Applied migrations are immutable; corrections are forward migrations. A migration lock/one authorized job prevents concurrent application. Never run schema reset, import, or automatic data seed against production. Operator identity/bootstrap belongs in a controlled environment-specific step, not a hard-coded production UUID/secret in a shared migration.

## Importer contract

Proposed future interface (not available in this PR):

```text
npm run db:import-json -- --source <captured-directory> --dry-run
npm run db:import-json -- --source <captured-directory> --target <approved-environment> --import-id legacy-json-v1
```

Require an explicit target and owner mapping for writes, verify project/database identity, and print a redacted destination summary. The import connection is a temporary operator credential outside client/Vercel bundles. Use a direct connection or an appropriate session connection for this controlled CLI, selected from the project's supported connectivity. Never split the atomic import into many independent Data API writes.

1. Capture `pens.json`, `inks.json`, and `refillLog.json` together from the approved source. Preserve immutable raw bytes outside public assets/build output and record capture time, source location, source commit if known, byte sizes, per-file SHA-256, and a combined hash over ordered filename/hash pairs. Include mapping version and owner mapping in the import manifest and idempotency comparison. Keep live snapshots access-controlled; do not commit private notes into a public repo just for convenience.
2. Validate the complete source in memory before opening a write transaction. Check shape and field allowlists; permit documented legacy `index` only. Validate actual dates, referential integrity, unique inventory IDs, ink arrays/order, booleans, colors, and all approved bounds. Record anomalies with file and array position. Source future dates are a review finding; never silently drop them. Preserve every accepted character, note, flag, and existing ID.
3. Map optional absent booleans to false and absent `colorHex` to NULL. Remove only the `NONE` inventory sentinel. Do not change catalog data, correct product names, infer unknown facts, or recompute `needsRefill`.
4. For source row at zero-based array position `i`, assign `id = legacy-refill-${i + 1}` and `sequence = i + 1`. Ignore embedded `index`. Identical payloads at different positions remain different rows. Map `NONE`-only or empty ink arrays to cleaning; reject mixed `NONE`/real ink and cleaning with residual-ink true. Real ink links preserve order at positions 0..n-1 and duplicates are validation errors, not silently deduplicated.
5. Begin one transaction, acquire the same collection advisory lock used by mutations, and check the import receipt. Matching import ID, owner, mapping version, and source checksum means **already imported, no writes**. A differing manifest/checksum or any populated domain tables without that matching receipt is an error. Never upsert into an active collection or erase subsequent user edits. For a new import require empty domain tables; establish the approved owner separately before import.
6. Insert pens/inks, then events and links; force deferred constraints to run before acceptance. Use explicit imported sequences, then advance the underlying sequence past the actual maximum so new events sort later. Do not hard-code 484 or 487. Sequence gaps, including after rolled-back attempts, are harmless; event identity/order must remain deterministic for a given source. PostgreSQL sequence allocation is not generally rolled back, so acceptance must compare rows/receipts rather than require an untouched sequence counter after failure.
7. Reconcile inside the transaction and insert the import receipt only if all checks succeed; commit both data and receipt together. Roll back on any unexplained discrepancy. A lost response is resolved by checking the receipt against the exact manifest, not by clearing tables or trying a new import ID.

`--dry-run` parses, transforms, validates, hashes, and reports the complete intended result with **no database or object writes**. It does not claim to prove database constraints. Rehearsal applies the same mapping to a disposable database, runs real constraints and reconciliation, and tests injected failures. Import command and validator must share mapping code to prevent dry-run drift.

## Reconciliation and tests

Counts alone are insufficient. Produce a machine-readable report and a short review summary tied to exact source hashes, importer commit, schema version, owner, and target identity. Compare:

- All inventory IDs, per-field values, flags and NULL/default mapping; every event's pen/date/notes/purity/kind; ordered links; deterministic IDs and sequence; all repeated events retained.
- Current pairing, empty/cleaned state, refill counts, ink histories, untried inks, archived filters, favorites, and queue. Use the same explicit `asOf` in old/new selectors; check multiple historical dates exercising same-day ties, cleanings, mixtures, and any future events.
- Catalog ID/brand association and custom/manufacturer/approximate swatch precedence. Catalog/source metadata remains unchanged; no media rows should appear without real source media.

Allow only documented representation differences: removed `NONE`, discarded embedded `index`, explicit false/NULL defaults, generated stable event IDs and maintenance timestamps, owner assignment, and cleaning kind. Preserve original strings rather than compare lossy normalized labels. Assert zero orphan references, zero duplicate links, and constraints satisfied. Database reads must be ordered explicitly.

Required importer tests: repeated same import is a no-op; same import ID with changed bytes/mapping/owner is rejected; existing domain rows without receipt are rejected; two simultaneous imports serialize; injected failure produces no partial rows/receipt; repeat source rows survive; invalid source aborts before writes; sequence remains usable and next event orders last. Required domain tests additionally cover stale versions, link failure rolling back the pen flag, current/backdated/same-day creation, edit/delete queue invariance, referenced inventory deletes, stranger/anonymous denials, receipt replay and mismatched reuse.

## Final live cutover

This is a future, separately authorized operation coordinated with whoever operates the current app. No cloud creation or live-source mutation is part of this PR.

1. Rehearse schema migration/import and candidate UI against an isolated copy. Approve reconciliation, security tests, deployment candidate, owner/timezone/visibility choices, and recovery evidence. Keep production serving the old app until the rehearsal passes.
2. Start maintenance and stop the old Express app, Vite development writers pointing at live files, JSON editing agents/jobs, Git data-sync, and host auto-update tasks. Verify mutation paths are closed. A hidden Save button does not freeze writers. Capture the final live files **after** this freeze, including uncommitted changes, and record the manifest. If any writer remained active, invalidate capture and repeat.
3. Verify the explicit production Supabase target and approved owner; apply reviewed schema through the controlled release job, then run the importer once against the final frozen capture. Reconcile fields/derived views and receipt while production app writes remain closed. Keep immutable final source capture and import report.
4. Build/select the matching Vercel candidate with production public URL/key and approved Auth redirect/domain settings. Smoke-test reads, deep links, permissions, and persistence against the imported database before switching traffic. Any permitted test write must be explicitly identified and reconciled, not silently pollute history.
5. Switch the production domain/alias and enable owner writes only after checks pass. Record source hashes, schema version, importer commit, application commit/deployment ID, and the time database writes opened. Disable legacy mutation endpoints and sync/updater tasks permanently. No dual-write period and no JSON fallback.
6. Verify actual user save, refresh, second session conflict behavior, sign-out isolation, and read-only access policy. Remove obsolete runtime Git/Vault/PAT mounts and JSON save infrastructure in a reviewed cleanup once recovery evidence is retained; do not indiscriminately revoke shared infra credentials.

Before database writes open, a failed import/candidate can leave maintenance active or return to the stopped legacy app using the unchanged final JSON capture. **After any database writes, that JSON is stale.** Prefer a forward fix or a previous database-compatible Vercel application release. Returning to JSON would require a new write freeze, an explicitly designed reverse export and full reconciliation; no such automatic rollback is in this plan. Never discard database writes to make rollback convenient. See [delivery/recovery](vercel-supabase-delivery.md).
