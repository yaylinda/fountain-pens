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
- Review screenshots are generated in ignored `.artifacts/desk-browser/`. They are review evidence, not test baselines or runtime assets. Library copies remain available below; no generated captures are tracked in this PR.

Run the browser check after building with synthetic public configuration:

```sh
VITE_SUPABASE_URL=https://synthetic.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic npm run build
npm run preview -- --host 127.0.0.1 --port 5188
CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/desk-browser.mjs
```

Playwright is a local verification-only install, not an application dependency. Tests ran on this Mac's Node 26; CI uses Node 22. Synthetic browser checks do not establish hosted Auth/PostgREST compatibility. No production writes, schema/security edits, merge or deployment were performed.

## Approved skill refinement

Installed only the approved pinned core directories using Codex's trusted Python installer:
- `design-taste-frontend`: Leonxlnx/taste-skill `a9c73c3d5dbf401e3e47f86e7b41f29ede1687df`, 38 core files.
- `build-awwwards-quality-sites`: MengTo/Skills `398cd41c86ba42fbb30e944ae507f463648f08b7`, 2 core files.

Every installed core file was byte-compared with the reviewed source; each root MIT LICENSE was retained. No automatic updater or additional skills installed. The installed files can be read and used immediately; no restart is needed for this task. Automatic skill-catalog discovery was not confirmed.

Art direction: the real swatches are the focal material; Silkscreen identifies the product and Fira Mono carries the working interface. The desk answers “what ink is in my pens, and what did I write with?” Reference pages answer “which pen or ink am I looking for?” Queue and Activity keep their dedicated jobs. Taste's app draw selected editorial-greeting (seed 123697366), using its clear personal-home hierarchy, adapted to the existing compact two-column desk rather than replacing approved layout. User constraints preserve the multicolor identity, underscore and selected underline. No artwork or new dependencies introduced.

Changes: a 650px stable detail slot, a smaller readable ink title, sticky writing controls inside the scroll area, a general refill action above the panel, a compact deselected prompt, stable space for save feedback, navigation/row feedback and a stronger swatch focus offset. Selection uses a short ease-out slide; existing reduced-motion rules bypass all transitions. Native scrolling remains; marketing entrances, GSAP, smooth-scroll libraries, Three.js and motion quotas are inappropriate for this daily data tool and explicitly excluded by the approved scope.

Validation: full `npm run check` passed again. Built Chrome tests rerun across public/owner/view-only modes, editing and all existing workflows. Added a geometry assertion that writing actions remain inside the selected panel with a long name at desktop/half width. Updated screenshots use synthetic intercepted Auth/RPC, zero production writes. The custom Playwright harness substitutes for the skill inspector so all screenshots contain controlled synthetic state. Style lint exceptions: Fira Mono is requested branding; ✎ and ✓ are functional indicators paired with text; box-shadow declarations draw focus/selection rings and underlines, not decorative elevation. No merge or deployment.

## Library review captures

- [selected-1440.png](https://chatgpt.com/api/library/files/libfile_ffed40170c248191a58056af20b6c0f9/download)
- [selected-780.png](https://chatgpt.com/api/library/files/libfile_d66a35634b54819197af83ca11bacf9b/download)
- [editing-1440.png](https://chatgpt.com/api/library/files/libfile_64e2f2a085a881918e076ed73e5123f7/download)
- [editing-780.png](https://chatgpt.com/api/library/files/libfile_8337eb3933e881918c68bccb888bb068/download)
- [deselected-780.png](https://chatgpt.com/api/library/files/libfile_c0badab1199c81918a13d93ddbba1b4d/download)
- [short-name-780.png](https://chatgpt.com/api/library/files/libfile_211cb7c2d1b48191b83e43ecc21fabbd/download)
- [pens.png](https://chatgpt.com/api/library/files/libfile_a1f73b5eb5a481918b6445f63fca9342/download)
- [inks.png](https://chatgpt.com/api/library/files/libfile_d912f221d1e48191aee36e1ff662cb98/download)
- [refill-queue.png](https://chatgpt.com/api/library/files/libfile_328bb5f5f8348191a7929beea003782d/download)
- [activity.png](https://chatgpt.com/api/library/files/libfile_f6363a2779388191bf3cf5a9bffd82ae/download)
- [public-desktop.png](https://chatgpt.com/api/library/files/libfile_bfc3aa4d8810819191b22f2e560df120/download)
- [view-only.png](https://chatgpt.com/api/library/files/libfile_eaf5f687f33c819194b5499176cf2d05/download)
- [empty.png](https://chatgpt.com/api/library/files/libfile_3c90523088f48191ad24445ee36fe369/download)
