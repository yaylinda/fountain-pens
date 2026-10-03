# My Desk personal palette

One saved arrangement belongs to Linda and is publicly readable. The palette sits in the existing My Desk palette position above pen results. Its labelled, paper-backed swatches retain color-to-pen filtering, favorites, and refill badges. The existing pen presets, filters, grouping, ordering, queue, and editor navigation remain available.

## Predictable rules

- One swatch per ink ID, regardless of how many pens use it. A mixed refill contributes each component ink; no blended color is invented. The pen list still identifies mixed refills.
- The palette uses all currently inked pens, independent of temporary pen filters. Selecting a swatch filters the pen list within those filters; “Show all colors” clears that selection. Pen ordering remains separate from palette ordering.
- On first use colors follow the existing rainbow order. Newly inked colors append in rainbow order when first encountered. Save captures their positions; there is no background write when a visitor opens the page.
- An ink that stops being current disappears from the palette, but its saved position and omission preference remain. Re-inking restores that preference. Archived pens follow the existing definition of currently inked; an archived ink still used by a current pen remains represented, as before.
- Omit affects only the palette. Omitted current inks remain available in an expandable list with “See pens” for readers and “Restore” while arranging. Restore retains the ink's relative saved position. Deleting an ink removes its palette preference through the foreign key cascade.
- Save commits the complete arrangement; Cancel discards the current edit. Errors retain the draft. Concurrent tabs use ordinary last-successful-save behavior, with no conflict/recovery infrastructure. Leaving My Desk discards unsaved local edits.

## UI and accessibility

Consulted the personal Impeccable skill at `~/.agents/skills/impeccable/SKILL.md`, its interaction/responsive references, and the repo's `.impeccable.md`. Retained Bodoni Moda/Figtree, warm paper and aubergine, with color reserved for actual ink swatches. Editor controls are disclosed through “Arrange palette”.

Pinned dnd-kit supports pointer/touch handles and Space → arrows → Space keyboard sorting (Escape cancels). Visible earlier/later buttons provide a gesture-free alternative. Handles and move/omit controls are at least 44×44 CSS pixels. Focus indicators, named controls, ink-name drag announcements, status messages, reduced-motion CSS, and stable focus after removal are included. Labels show ink name, brand, and collection separately from color.

## Persistence and deployment

`public.desk_palette` stores ink ID, position and omission under the existing sole owner. Forced RLS, explicit grants, and the existing `private.is_owner()` predicate protect writes; public reads follow existing collection policy. `save_desk_palette` is an invoker RPC that validates and replaces the arrangement atomically. `get_collection` includes the palette in its existing snapshot. Inventory and refill commands are unchanged.

Migration: `20261003190907_desk_palette.sql`. No live writes, schema deployment, new credentials, auth configuration or project changes were performed. Live read-only inspection confirmed the current `get_collection` definition and ink policies match the checked-in contract. GitHub's Supabase integration remains the only schema deployer; production remains gated by main and the exact-SHA check. This PR is draft and has no hosted preview.

## Verification (2026-10-03)

`npm run check` passes: 69 application/behavior tests, 8 deployment tests, lint, TypeScript/Vite production build, 13 importer tests and the disposable PostgreSQL 17.11 database harness. New coverage checks repeated move/omit/restore, cancellation, failed-save drafts, empty palette, public controls, stable dormant preferences/new arrivals, public DB reads, anonymous/non-owner denial, owner round trips, invalid-save rollback, and unchanged pens/refill events. Existing Vite chunk-size warning remains; npm reports existing dependency advisories (no broad dependency upgrade in this feature).

Browser QA used agent-browser with a fully synthetic fetch fixture. Desktop (1440×1100) and emulated iPhone 15 (393 CSS px) were visually inspected. Mouse drag, keyboard drag, earlier/later controls, repeated omit/restore, cancellation, failed save/retry, reload persistence, owner/public modes, duplicate ink across pens, mixed component inks, no-current-ink and all-omitted states were exercised. CDP touchStart/touchMove/touchEnd verified touch sorting and touch fallback actions. Mobile showed no horizontal overflow and 44px controls. This is Chromium/device emulation, not a physical iOS/Android or hosted Auth/PostgREST test.

Reproduce locally:

```sh
VITE_SUPABASE_URL=https://synthetic.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic npm run dev -- --host 127.0.0.1 --port 5180
```

Open `/tests/palette-preview.html`. Use any non-`fail` email and any password in its synthetic sign-in to exercise saves. `?mode=public` hides all owner controls; `?empty` supplies no current refills. The fixture intercepts all synthetic Supabase calls, rejects other operations, and stores mock preferences only in sessionStorage. `sessionStorage.setItem('synthetic-fail','true')` forces save failure; remove it to retry. None of these switches are in the production entry point.

| Evidence | Screenshot |
| --- | --- |
| Desktop palette | [View](qa/desk-palette/desktop.png) |
| Desktop arrangement | [View](qa/desk-palette/desktop-edit.png) |
| Mobile arrangement | [View](qa/desk-palette/mobile-edit.png) |
| Mobile public palette | [View](qa/desk-palette/mobile-public.png) |
| All colors omitted, reversible | [View](qa/desk-palette/all-omitted.png) |
| No currently inked colors | [View](qa/desk-palette/empty.png) |

Read-only hosted security advisors reported existing findings outside this feature: private allowlist/import tables with intentionally no public policies, grants on the provider's `public.rls_auto_enable()` definer function ([anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)), and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No new definer function or auth change is included here.
