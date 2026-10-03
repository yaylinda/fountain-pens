# Collection database

See [runtime contract and setup](RUNTIME.md) for public reads, owner-only CRUD, migration coordination and verification boundaries.

The schema stores pens, inks, refill events and ordered event/ink links. Cleaning events have no links. `private.collection_owner` binds the single approved Auth UUID; `private.data_imports` records the one-time source import. Ordinary relational constraints preserve history and reject referenced inventory deletion.

The fixed source is `src/data/{pens,inks,refillLog}.json`. Do not remove or rewrite it before the approved one-time import. It contains 50 pens, 194 real inks, 486 events and 507 links. `NONE` becomes a cleaning event; duplicate source events and source ordering are preserved. No app startup or browser request performs the import.

Run `npm run db:import-json -- --source src/data --as-of 2026-10-03 --dry-run` to inspect the source manifest. The reusable importer in `scripts/migration/legacy.mjs` is exercised only against disposable databases here; the hosted import is separately authorized. Its transaction, empty-target guard and source marker support one-time import verification; it is not a runtime write service.

Validation: `npm run test:migration` checks source conversion and malformed fixtures. `npm run test:db` installs the schema in disposable PostgreSQL 17.11 under managed-like permissions, exercises public/owner access and atomic CRUD, imports the fixed fixture and reconciles counts. Docker is required. These checks do not substitute for hosted Auth and PostgREST verification.
