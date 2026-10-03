# Ink & nib

A personal writing desk for fountain pens, ink inventory, and refill history. Built with React, TypeScript, and Vite.

## The collection

- **The desk** shows the latest pen-and-ink pairings, recent journal entries, and inks you have yet to try.
- **Fountain pens** keeps finish, nib, latest ink, and refill counts together. Search by pen details or current ink; filter by brand, nib, and status.
- **Ink cabinet** presents the collection with reference swatches, usage counts, brand filters, and untried/in-use views.
- **Refill journal** groups entries by month. Search pen details, ink names, and notes; filter by pen, date range, or entry type.

Both inventory pages offer **List** and **Grid** layouts. Each page remembers its choice in this browser, and switching layouts keeps your search, filters, and sorting.

Pens have an optional **Needs refill** checkbox and a matching inventory filter. This queue is independent of **Inked**/**Empty**: an empty pen can stay on the shelf or wait for a refill, and an inked pen can be flagged ahead of time. Choose the flag when editing a pen or logging a new current cleaning. A new refill that becomes the latest entry clears it automatically. Entries older than a pen's latest event, along with journal edits and deletions, do not change the queue; adjust the pen's checkbox when needed. Archived pens are excluded from the queue until restored.

Open any item to edit its details and see its history. Refill entry supports searchable pen and ink choices, mixtures, cleaning events, and reusing the last pairing. Add a missing pen or ink from the refill workspace and return to the unfinished entry. Unsaved edits are protected when navigating away.

Editors have their own URL and browser history entry. Back returns to the previous workspace with its filters, layout, and inventory scroll position; Forward reopens the editor. Unsaved changes are protected for browser navigation as well as in-app links. Returning from a new pen or ink restores the unfinished refill. Direct editor links can also return safely to the collection.

Hover over, focus, or tap an ink name in the pen inventory to see its brand and collection. The ink grid's **In N pens** indicator previews the pens currently using that ink, including their finish and nib details. Escape or a tap outside dismisses the preview. Refill badges share the pen's brand line in list view to keep rows compact.

Archive an item to remove it from the active collection while keeping its journal history. Restore it from the Archived filter. Inventory items without history can also be deleted; deleting a journal entry recalculates the latest pairing.

## Development

Use Node.js 22.16.0 (the CI version), or compatible Node 20.19+. Copy `.env.example` to `.env.local` and supply the approved Supabase URL and **publishable** key. The database must have the reviewed migrations and approved Auth owner configured; there is no JSON fallback or public signup. See [runtime setup](supabase/RUNTIME.md).

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

`npm test` runs domain tests and DOM interaction tests with mocked APIs. It does not open a browser or modify inventory JSON. Follow the repository's local verification policy: browser verification is opt-in.

## Source data

Anyone can browse the collection and journal notes. Only the approved owner can sign in and save changes. Saves use straightforward database CRUD; a refill, its ordered ink links and queue effect commit together. Journal URLs use stable event IDs, and same-day ordering uses the database sequence. Calendar behavior uses America/Chicago. Ordinary form failures keep the current draft available for correction.

These fixed JSON files are retained for one-time import reproducibility, tests and audit history:

- `src/data/pens.json`: source pen inventory.
- `src/data/inks.json`: source ink inventory, including the legacy cleaning sentinel.
- `src/data/refillLog.json`: source journal entries in original order.

No build, startup or web request imports or writes those files. The importer maps `NONE` to cleaning events with no ink links; future entries remain in history but do not change today's pairing. Manufacturer catalogs and approximate swatch references remain versioned reference data. Browser storage holds layout preferences and Supabase's normal Auth session; ordinary form drafts stay in memory while editing.

## Code organization

- `src/lib/collection.ts`: typed selectors, calendar-date handling, search, reference swatches, and refill validation.
- `src/hooks/useCollection.ts`: app-level loading, retry, and refresh.
- `src/hooks/useEditorNavigation.ts`: editor URLs, browser history, draft protection, and return positions.
- `src/components/collection/`: dashboard, inventories, journal, editing workspaces, and shared presentation components.
- `src/App.tsx`: navigation, draft protection, feedback, and owner session controls.
- `src/index.css` and `src/App.css`: design tokens, shared controls, layouts, and responsive rules.

Swatches use the existing `scripts/output.json` reference, with a user-recorded `colorHex` taking precedence. Unmatched inks display an explicit unknown swatch. These are approximate screen colors, not photographic ink samples. Fonts are self-hosted in `public/fonts` with their OFL licenses.

## Production delivery

The live app is [Ink & nib](https://project-erq6t.vercel.app), a Vite SPA on Vercel backed by Supabase. GitHub Actions deploys production only after application/database checks and the exact-SHA successful Supabase integration schema check. Supabase's GitHub integration owns schema deployment from main. PRs run CI without hosted previews. See [production operations](docs/deployment.md).

Run `npm run check` for all application, deployment, lint, type/build, migration and database checks. Docker is needed only for the disposable PostgreSQL test harness. The retired container server, JSON write endpoints and Git synchronization are removed.

See the [architecture](docs/design/client-api-postgres.md), [runtime contract](supabase/RUNTIME.md), [schema](docs/design/supabase-schema.md), and [import reproducibility guide](docs/design/supabase-migration.md). Linda manually validated production login and updates after the rearchitecture; local synthetic checks still do not establish hosted Auth/PostgREST behavior for later changes.
