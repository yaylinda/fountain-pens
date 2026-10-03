# Application architecture

Ink & nib is a React/TypeScript Vite SPA hosted on Vercel. Supabase supplies Auth and PostgreSQL. Anyone can browse the collection and displayed journal notes; only Linda's approved Auth UUID can write. Email/password sign-in has no public signup. The database allowlist and RLS enforce authorization independently of visible controls.

## Data flow

1. `OwnerControls` manages the normal Supabase Auth session. `dataService.ts` calls `get_collection()` for pens, inks, events, ordered ink links, Chicago `asOf` and `canEdit`.
2. `collectionAdapter.ts` validates the RPC response and maps SQL/API fields to the UI model. Stable event IDs identify journal routes; decimal-string sequences preserve same-day ordering without JavaScript bigint precision loss.
3. Inventory and refill RPCs save ordinary CRUD changes. Refill events, ordered links and queue effects commit atomically. The client applies the confirmed result and refreshes; a failed refresh after success shows a saved/refresh warning.
4. Forms keep drafts in memory, protect navigation, disable duplicate submissions and show save errors. There are no expected-version checks, retry receipts, automatic write replay, advisory locks or session draft registries.

No server process, filesystem API, mutable JSON fallback, home-network authorization or Git synchronization participates in runtime persistence. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` enter the browser bundle. Privileged credentials are never browser configuration.

## Interface and reference data

The desk, searchable pen/ink inventories, journal and dedicated editors share typed selectors in `src/lib/collection.ts`. List/grid preferences are browser-local; form drafts remain in memory. The visual system uses warm paper, aubergine, brass accents and meaningful ink swatches, with self-hosted Bodoni Moda and Figtree fonts.

Custom ink colors take precedence over manufacturer reference colors, approximate generated swatches and an explicit unknown state. Pilot/Wearingeul catalogs and `scripts/output.json` remain versioned reference assets. The three fixed inventory/journal JSON files are offline import/test evidence only. No upload feature, media table or Storage bucket is implemented.

## Delivery and verification

[GitHub Actions](../../.github/workflows/checks.yml) runs application, deployment, lint, build, import and disposable database checks. Main releases wait for the exact-SHA successful Supabase integration schema check before Vercel deployment. Supabase's GitHub integration is the schema deployer. PRs have no hosted previews.

See [runtime contracts](../../supabase/RUNTIME.md), [schema](supabase-schema.md), [import evidence](supabase-migration.md), and [deployment operations](../deployment.md). Earlier private-browsing and concurrency/recovery proposals were intentionally not implemented; Git history retains those proposals.
