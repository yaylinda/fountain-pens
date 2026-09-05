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

During `npm run dev`, saving an inventory item or journal entry sends the updated JSON array to the Vite API, which writes the corresponding file under `src/data/` in this checkout. Those edits survive reloads and server restarts. They are local working-tree changes until explicitly committed and pushed; saving in the app does not publish them to GitHub. Browser local storage holds layout preferences, not inventory records. The existing sync review is available under **Data tools**.

No source inventory migration is required. Optional, backward-compatible fields support the interface: `archived` on pens/inks, `needsRefill` on pens, and `colorHex` on inks. They are added only when the corresponding action is used. Pens without `needsRefill` are treated as unflagged.

The legacy ink ID `NONE` represents a cleaned/empty pen. It is excluded from ink inventory and refill counts. The newest calendar date determines the latest pairing; for same-day entries, the later position in the original JSON array wins. Future entries remain in history but do not change today's pairing. Historical events retain their original array position for editing; UI-only fields are never added to new saved events.

## Code organization

- `src/lib/collection.ts`: typed selectors, calendar-date handling, search, reference swatches, and refill validation.
- `src/hooks/useCollection.ts`: app-level loading, retry, and refresh.
- `src/hooks/useEditorNavigation.ts`: editor URLs, browser history, draft protection, and return positions.
- `src/components/collection/`: dashboard, inventories, journal, editing workspaces, and shared presentation components.
- `src/App.tsx`: navigation, draft protection, feedback, and the existing data-tools entry point.
- `src/index.css` and `src/App.css`: design tokens, shared controls, layouts, and responsive rules.

Swatches use the existing `scripts/output.json` reference, with a user-recorded `colorHex` taking precedence. Unmatched inks display an explicit unknown swatch. These are approximate screen colors, not photographic ink samples. Fonts are self-hosted in `public/fonts` with their OFL licenses.

## Production delivery

The Express server negotiates response compression. Vite's fingerprinted `/assets/` files are cached for one year with `immutable`; HTML revalidates, and API responses use `no-store` so inventory stays fresh. Missing assets return 404 rather than the app document. Unversioned files such as fonts and the favicon retain revalidation.

To compare response-body transfer sizes using the same local build and inventory:

```sh
npm run build
node scripts/measure-delivery.mjs
```

The benchmark runs temporary local HTTP servers and performs no saves or git operations. On the September 5 snapshot, initial JS/CSS plus inventory fell from 448,376 to 127,240 bytes with gzip (71.6%). This excludes HTML, fonts, and protocol overhead and measures transfer size, not browser paint time.

Read [the application review](docs/app-review.md) for findings and implementation decisions.
