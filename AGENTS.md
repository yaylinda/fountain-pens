# AGENTS.md

Guidance for contributors and coding agents working in this repository.

## Build & Development Commands

```bash
npm ci               # Install locked dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Type-check and build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Python Scripts (in `scripts/`)
The `scripts/` directory contains a Python utility for scraping ink hex colors from inkswatch.com. Uses `uv` for dependency management (see `pyproject.toml`).

## Architecture

### Data Flow
The React/Vite SPA uses public Supabase reads and owner-only writes:
1. Everyone can browse collection data and displayed journal notes. `OwnerControls` offers email/password sign-in with no signup UI.
2. `dataService.ts` reads `get_collection`, including the database-approved `canEdit` capability.
3. Inventory CRUD and refill RPCs use invoker rights, owner checks and RLS. A refill's event, ordered ink links and queue effect commit atomically.
4. Normal forms keep drafts during editing and show save errors. Do not add retry receipts, expected-version conflicts, advisory locks or session draft recovery.
5. No mutable JSON fallback, file API plugin, LAN authorization or Git sync is part of the browser runtime.

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser configuration. Never supply secret/service-role credentials. See `supabase/RUNTIME.md` for contracts and verification limits.

`src/data/{pens,inks,refillLog}.json` is the fixed offline importer source, not runtime inventory. Keep the source snapshot and manufacturer/reference catalogs. Preserve these inputs for reproducible import tests and audit history; they are not current production data.

### Verification
Run `npm test`, `npm run lint`, `npm run build`, `npm run test:migration`, and `npm run test:db`. The database harness only creates its own labeled disposable PostgreSQL container. Node 22 is the CI runtime; the app test runner enables native WebSocket support when run under Node 20. Local synthetic tests do not establish hosted Auth/PostgREST compatibility.

## Deployment

GitHub Actions in `.github/workflows/checks.yml` owns Vercel production deployment after application/database checks and the successful exact-SHA Supabase integration check. Supabase's GitHub integration owns schema deployment from main. There are no hosted PR previews. See [deployment operations](docs/deployment.md).

Run `npm run check` for the aggregate application, deployment, lint, type/build, migration and disposable database checks. Never modify applied migration files. Docker is used only by the disposable database harness, not to host the app. No LAN gating, filesystem writes, Git sync or legacy container deployment belongs in the application.
