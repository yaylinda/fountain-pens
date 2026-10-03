# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
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

`src/data/{pens,inks,refillLog}.json` is the fixed offline importer source, not runtime inventory. Keep the source snapshot and manufacturer/reference catalogs. The legacy `server.js` and file API fixtures remain for the old deployment until its separate retirement; do not reattach them to Vite.

### Verification
Run `npm test`, `npm run lint`, `npm run build`, `npm run test:migration`, and `npm run test:db`. The database harness only creates its own labeled disposable PostgreSQL container. Node 22 is the CI runtime; the app test runner enables native WebSocket support when run under Node 20. Local synthetic tests do not establish hosted Auth/PostgREST compatibility.

## Deploy Auth Responsibilities

- Deployment auth is infra-owned in `homelab-infra` and read at runtime from Vault.
- Canonical deploy-auth path for this repo: `secret/homelab/deploy-auth/fountain-pens`.
- The deploy PAT from that path is used for both HTTPS git fetch and GHCR image pulls.
- This repo continues to own only its application secret schema/policies in Vault.
- Do not rely on persistent deployment creds in `~/.docker/config.json` or `~/.git-credentials`.

