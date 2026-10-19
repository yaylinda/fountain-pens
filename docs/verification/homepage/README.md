# Sole homepage verification

The Tamagui desk now mounts from `index.html` through `src/main.tsx` and `src/App.tsx`. Vite builds one HTML entry. The former app, React Router, catalog/editor routes, Vercel route rewrites, `desk-lab.html`, old UI/styles/fonts and obsolete UI tests are deleted. There are no compatibility redirects or alternative app entry points. The historical design notes in `docs/desk-lab` are documentation only.

## Retained

- Public collection browsing and database-approved owner access through the existing Supabase password flow.
- Named palette create/rename/duplicate/delete, pointer/keyboard ordering, omission/restoration and dormant-color reconciliation.
- Current pen chooser, mixed inks/residual ink, activity, refill queue, refill/cleaning creation and correction.
- Refill-specific writing today, backdating, correction and deletion.
- Existing draft retention on failed saves, shared dialog focus/Escape behavior and auth-change capability revocation.
- Recorded ink colors, Silkscreen branding, Fira Mono UI, neutral surfaces and yellow/red/green/blue accents.
- Shared data/auth adapters, database contracts, all migrations, importer snapshots and reference catalogs. No production writes, schema changes or cloud configuration changes.

## Intentionally removed from the UI

Inventory create/edit/delete/archive/restore; favorite controls; rich reference and source-detail screens; broad catalog and journal search/filter/group/layout controls; refill-event deletion; inline inventory creation while logging a refill; reuse-last-pairing; URL-based editors and navigation draft guards; old save-celebration artwork. Writing-record deletion remains supported. Data behind the removed controls is retained. These features were not ported for parity, per Linda's explicit instruction to delete the old code without backward compatibility.

## Checks

- 23 application/domain/service tests, 8 deployment tests and 13 migration tests pass.
- ESLint and TypeScript/production build pass. The existing >500 kB bundle warning remains (runtime Tamagui; no bundle optimization in this change).
- Disposable PG17.11 harness passes owner/public authorization, atomic mixed refills, cleaning/queue behavior, palette/writing CRUD, reference preservation and source reconciliation (50 pens, 194 inks, 486 events, 507 links).
- Real Chromium against the **production preview**, starting at `/`, then direct `/index.html` and reload. All backend calls intercepted; synthetic login and 13 synthetic RPC writes, zero real writes. Palette create/edit/keyboard reorder/omit/restore/duplicate/delete, writing add/correct/delete, separate pens sharing ink, mixed refill, failed-save retention, cleaning/correction, focus restoration, public/owner gating and 780px overflow pass. No browser errors.
- Desktop 1440px and half-width 780px screenshots visually inspected. Ordinary wrapping and the selected-ink panel remain beside the palette.

These tests do not establish hosted Auth/PostgREST compatibility. No merge or deployment performed.

## Captures

All data and colors in these captures are synthetic fixtures built from the fixed importer inventory, not a live owner session.

- [Public desktop](public-desktop.png)
- [Owner desktop](connected-desktop.png)
- [Owner half-width](connected-half-width.png)
- [Writing correction](connected-writing.png)

## Repeat

Build with synthetic public configuration, then serve the production build:

```sh
VITE_SUPABASE_URL=https://synthetic.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic npm run build
npm run preview -- --host 127.0.0.1 --port 5188 --strictPort
```

With Playwright installed in a temporary directory:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium \
node tests/desk-browser.mjs
```

The harness fails closed for unknown external requests. It writes captures to this directory and does not use production credentials.
