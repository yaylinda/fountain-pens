# Desk navigation and hierarchy iteration

Based on main `469e1a80fd4fe22c74379e409988a47a90827f6c` (PR27). All three supplied Library screenshots were materialized and inspected before implementation.

## Design

Preserve Silkscreen branding, Fira Mono UI, the colored wordmark, My desk underscore and yellow navigation underline, swatch cards, selected-ink color bar and inline pen selection. The historical paper/brass direction is context only.

Palette: paper `#fcfbfc`, text `#242426`, yellow `#f3d51b`, blue `#185b98`, green `#226943`, red `#ad2635`. Yellow marks selection and primary writing actions; blue marks reference/account information and refill actions; green identifies the owner; red marks destructive actions and refill-needed status. Text and symbols accompany status colors. Ink colors continue to come from the existing domain resolver without alteration.

## Functionality

- Five hash-addressable peer views with native links, current-page indication, browser history and document titles: My desk, Pens, Inks, Refill queue, Activity.
- Activity is a page; writing history and refill corrections remain focused dialogs. The refill queue is no longer on the homepage.
- Pens and Inks have alphabetical searchable lists, archived-item inclusion, and inline reference details. Pen references include nib/color/current fill. Ink references include color provenance, current pens, prose, manufacturer facts, writing references and source links when supplied by the existing backend. No inventory CRUD was added.
- Header explicitly distinguishes signed out/public, signed in/view only, and signed in/owner. Palette editing has a separate local indicator. Drafts survive switching peer views.
- Palette choices use stronger type and a separate row from compact editing actions. Existing CRUD, keyboard reorder, omit and restore are preserved.
- Clicking the selected swatch again or its close button deselects it. A 180ms opacity/translation transition preserves the panel footprint; hidden controls are inert. Close returns focus to the selected swatch. Reduced motion disables transitions.
- The selected area reserves 650px (620px on narrow screens) and scrolls long content. Essential names and mix information wrap without truncation. Short/long/empty selection states cannot change the workbench dimensions.
- SVG pen-nib favicon uses the terminal palette and stays readable at small sizes. PNG 32px and 180px Apple touch assets are rendered from that SVG.

## Verification

- `npm test`: 23 passing application/domain/runtime tests.
- `npm run test:deployment`: 8 passing checks.
- `npm run lint` and `npm run build`: pass. Existing bundle-size warning remains.
- `npm run test:migration`: 13 passing checks.
- `npm run test:db`: pass against the repository's disposable PostgreSQL 17.11 harness.
- `tests/desk-browser.mjs`: actual production Vite build, Chrome, intercepted synthetic Auth/RPC data. 13 synthetic writes; zero production writes. Covers public/owner/view-only gates, writing add/correct/delete, palette keyboard order/omit/restore/copy/delete/new, mixed refill, failed-save draft retention, cleaning/correction, peer navigation/back, searchable references, empty state, reduced motion, and fixed document-relative selection geometry at 1440px and 780px.
- Screenshots in this directory are viewport captures from those tests, using synthetic ink colors and records. `selected-*`, `deselected-*`, `editing-*`, `pens.png`, `inks.png`, `refill-queue.png`, `activity.png`, `public-desktop.png`, `view-only.png`, and `empty.png` are the review set.

Run the browser check after building with synthetic public configuration:

```sh
VITE_SUPABASE_URL=https://synthetic.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic npm run build
npm run preview -- --host 127.0.0.1 --port 5188
CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/desk-browser.mjs
```

Playwright is a local verification-only install, not an application dependency. Tests ran on this Mac's Node 26; CI uses Node 22. Synthetic browser checks do not establish hosted Auth/PostgREST compatibility. No production writes, schema/security edits, merge or deployment were performed.
