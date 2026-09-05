# Ink & nib

A personal writing desk for fountain pens, ink inventory, and refill history. Built with React, TypeScript, and Vite.

## The collection

- **The desk** shows the latest pen-and-ink pairings, recent journal entries, and inks you have yet to try.
- **Fountain pens** keeps finish, nib, latest ink, and refill counts together. Search by pen details or current ink; filter by brand, nib, and status.
- **Ink cabinet** presents the collection with reference swatches, usage counts, brand filters, and untried/in-use views.
- **Refill journal** groups entries by month. Search pen details, ink names, and notes; filter by pen, date range, or entry type.

Open any item to edit its details and see its history. Refill entry supports searchable pen and ink choices, mixtures, cleaning events, and reusing the last pairing. Add a missing pen or ink from the refill workspace and return to the unfinished entry. Unsaved edits are protected when navigating away.

Archive an item to remove it from the active collection while keeping its journal history. Restore it from the Archived filter. Inventory items without history can also be deleted; deleting a journal entry recalculates the latest pairing.

## Development

Use Node.js 20.19 or later.

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
```

`npm test` runs domain tests and DOM interaction tests with mocked APIs. It does not open a browser or modify inventory JSON. Follow the repository's local verification policy: browser verification is opt-in.

## Source data

The app continues to use three JSON arrays:

- `src/data/pens.json`: pen identity, brand, model, finish, nib size, and material.
- `src/data/inks.json`: ink identity, brand, collection, and name.
- `src/data/refillLog.json`: calendar date, pen ID, ink IDs, and notes.

The existing data service loads and saves these collections through the existing API. Deployment and synchronization infrastructure are separate from the interface. The existing sync review is available under **Data tools**.

No source inventory migration is required. Two optional, backward-compatible fields support the interface: `archived` on pens/inks, and `colorHex` on inks. They are added only when the corresponding action is used.

The legacy ink ID `NONE` represents a cleaned/empty pen. It is excluded from ink inventory and refill counts. The newest calendar date determines the latest pairing; for same-day entries, the later position in the original JSON array wins. Future entries remain in history but do not change today's pairing. Historical events retain their original array position for editing; UI-only fields are never added to new saved events.

## Code organization

- `src/lib/collection.ts`: typed selectors, calendar-date handling, search, reference swatches, and refill validation.
- `src/hooks/useCollection.ts`: app-level loading, retry, and refresh.
- `src/components/collection/`: dashboard, inventories, journal, editing workspaces, and shared presentation components.
- `src/App.tsx`: navigation, draft protection, feedback, and the existing data-tools entry point.
- `src/index.css` and `src/App.css`: design tokens, shared controls, layouts, and responsive rules.

Swatches use the existing `scripts/output.json` reference, with a user-recorded `colorHex` taking precedence. Unmatched inks display an explicit unknown swatch. These are approximate screen colors, not photographic ink samples. Fonts are self-hosted in `public/fonts` with their OFL licenses.

Read [the application review](docs/app-review.md) for findings and implementation decisions.
