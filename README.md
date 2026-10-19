# Fountain Pens

A personal writing desk for fountain pens, built with React, Tamagui, TypeScript and Vite. The approved desk is the sole application at `/`.

## The desk

- Browse saved palettes and current pen/ink pairings. Select a color and choose among its current pens, including mixed refills and residual ink.
- Owners can create, rename, duplicate, delete, reorder, omit and restore palette colors. Dormant colors retain their arrangement.
- Record writing today or add, correct and delete dated writing records for a particular refill.
- Add or correct refills and cleanings with searchable pen/ink choices, multiple inks, notes and the existing atomic refill-queue behavior.
- Browse refill activity and the refill queue. Public visitors see the same collection; password sign-in enables owner controls only when the database grants `canEdit`.
- Failed saves retain drafts; dialogs support keyboard focus and Escape. Silkscreen branding, Fira Mono controls and recorded ink colors are preserved.

The old application has been deleted, including inventory CRUD/archive/restore/favorites, rich reference-detail screens, broad catalog/journal filtering, refill deletion, URL-based editors and compatibility routes. These are not available in this UI. There is no Full collection link or separate lab entry. Existing inventory, references and history remain in the database; no schema or production data was changed. This is an intentional scope reduction, not feature parity.

## Development

Use Node.js 22.16.0 (CI), or compatible Node 20.19+. Copy `.env.example` to `.env.local` and supply the approved Supabase URL and **publishable** key. See [runtime setup](supabase/RUNTIME.md).

```sh
npm ci
npm run dev
npm run check
```

`npm run check` runs application/service tests, deployment guards, lint, type/build, migration tests and the disposable PostgreSQL harness. Docker is required only for that harness. The [browser check](docs/verification/homepage/README.md) exercises the built default entry with synthetic owner sessions and no production writes.

## Data and code

Supabase owns runtime data and authorization. Calendar behavior uses America/Chicago. Same-day events use the database sequence. Refills, ordered ink links and queue effects commit together. Drafts stay in memory; Supabase manages its normal Auth session.

Fixed importer snapshots in `src/data/{pens,inks,refillLog}.json`, manufacturer catalogs and approximate swatch references remain versioned for reproducible imports and audit history. The runtime does not import those files or join catalogs by name. Custom colors take precedence over migrated manufacturer/reference colors; unknown colors are not invented.

- `src/main.tsx` and `src/App.tsx`: the sole entry and desk.
- `src/desk/`: Tamagui theme, controls, dialogs, auth and styles.
- `src/hooks/useCollection.ts`: loading, retry and refresh.
- `src/lib/`: domain selectors, date/search/refill validation, palette reconciliation and color ordering.
- `src/services/`: typed collection adapter, Supabase client and mutations used by the desk.

Fonts are self-hosted with their OFL licenses. [Design history](docs/desk-lab/README.md) records the approved direction.

## Production delivery

[Live app](https://project-erq6t.vercel.app). GitHub Actions deploys production only after application/database checks and the exact-SHA successful Supabase integration check. Supabase's GitHub integration owns schema deployment from main. PRs have no hosted previews. See [production operations](docs/deployment.md).

This transition changes no schema, cloud configuration or deployment pipeline. Local synthetic checks do not establish hosted Auth/PostgREST compatibility. Merge and production deployment remain separate approval steps.
