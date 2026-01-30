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
The app uses an **in-memory data store** with JSON file persistence during development:
1. Data loads from `src/data/*.json` files at startup
2. `dataService.ts` maintains in-memory arrays for pens, inks, and refill logs
3. On any data mutation, changes persist back to JSON via `fileService.ts` → custom Vite plugin (`vite-file-api-plugin.ts`)
4. The Vite plugin exposes `POST /api/save-json` endpoint that writes to `src/data/{filename}.json`

### Key Types (`src/models/types.ts`)
- **Pen**: id, brand, model, color, nibSize, nibType
- **Ink**: id, brand, collection, name  
- **RefillLog**: date, penId, inkIds[], notes (tracks when pens were filled with which inks)
- **RefillLogDisplay**: extends RefillLog with resolved pen/ink details for UI

### Services Layer (`src/services/`)
- `dataService.ts`: CRUD operations for all entities, maintains in-memory state
- `fileService.ts`: JSON persistence via Vite dev server API, toast notifications
- `countService.ts`: Derived data (refill counts, most recent ink per pen)

### Component Structure
- `App.tsx`: Tab-based layout (Refill Log, Inks, Pens)
- Each tab has a corresponding list component in `src/components/{Entity}/`:
  - Sortable tables with MUI components
  - Inline add/edit dialogs
  - Color-coded chips for brands/collections using HSL hashing

### Data Relationships
- RefillLog references pens by `penId` and inks by `inkIds[]` (supports ink mixing)
- Components join data at render time via `getPenById()` / `getInkById()`
