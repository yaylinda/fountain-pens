# CLAUDE.md

A React TypeScript web application for managing fountain pen and ink collections. Track pens, inks, and "currently inked" combinations with usage statistics.

## Key Directories

- `src/components/` - React UI components (RefillLog, Pens, Inks tables and dialogs)
- `src/services/` - Business logic: dataService.ts (CRUD), fileService.ts (API I/O), countService.ts (metrics)
- `src/models/types.ts` - TypeScript interfaces (Pen, Ink, RefillLog)
- `src/data/` - JSON data files (pens.json, inks.json, refillLog.json)
- `server.js` - Express backend for production
- `vite-file-api-plugin.ts` - Development API middleware

## Running the Project

```bash
npm install        # Install dependencies
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build
npm start          # Production server (requires build first)
npm run lint       # Run ESLint
```

**Docker:**
```bash
docker-compose up  # Run at http://localhost:8045
```

## Architecture Notes

- In-memory data store initialized from JSON files, with async file persistence
- API endpoints: `/api/data` (load), `/api/save-json` (save)
- Environment variables: `DATA_DIR` (data directory), `PORT` (server port, default 8080)

## Conventions

- Pens sorted by brand → model → nibSize (custom nib ordering: EF, F, M, B, BB, BBB, BBBB, Stub, Italic, Music, Fude)
- Inks sorted by brand → collection → name
- RefillLogs sorted by date (most recent first)
- Dialog-based CRUD with optimistic in-memory updates
- MUI Autocomplete with freeSolo for brand/model/collection fields
