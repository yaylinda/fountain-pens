# Desk palettes

The desk opens on a compact swatch sheet. Saved palettes are the main workspace; selecting a color reveals its pens and their detail/refill actions. The refill queue lives below the workspace and starts collapsed. Collection’s Pens and Inks subtabs own full inventory management; the journal owns history.

## Saved arrangements

- Create a named palette with New palette, use More palette actions to duplicate or delete, or use Arrange palette to rename and reorder it. Creation and duplication show a new unsaved draft instead of the saved-palette selector. Save and Cancel appear together only while editing. Cancel restores the prior saved selection; Save selects the new arrangement. Save commits the name, order and omissions together. Cancel discards the edit; failed saves retain it. Switching palettes is disabled while arranging.
- Arrangements are stored in Supabase, publicly readable and editable only by the owner. Palette selection is in the URL and survives opening and returning from pen/ink details. Deletion asks for confirmation and affects only that arrangement.
- The original saved arrangement migrates to “My palette”. Duplicate copies both visible and dormant preferences. A new palette starts with all current inks in rainbow order.
- Each arrangement tracks currently inked colors, one swatch per ink ID. A mixed refill contributes each component without inventing a blended color. New current colors append in rainbow order; dormant positions and omissions survive until that ink is current again.
- Omit hides a color only in that arrangement. Its pens and history remain intact. Omitted colors can be restored or used to inspect their pens.
- Selecting a swatch shows its current pens. Closing the details returns to the palette; there is no standalone pen browser on My Desk.
- The empty library offers a fresh “My palette” workspace. It writes nothing until Save. Leaving the desk discards an unsaved palette edit, as before.

## Presentation

The desk uses one compact palette toolbar, an open swatch sheet, and swatch-selected pen details plus the collapsed refill queue. Following visual review, it retains main’s rectangular tab silhouette (`border-radius: 3px 12px 3px 3px`) and inset outline, now filling each card’s inner width while respecting its padding, with height derived from a 2:1 width-to-height ratio. This treatment is scoped to the desk palette; other swatches retain their existing shapes. The earlier historical oval trial came from `0eb4797`; Linda preferred the main tab treatment introduced by `b80149b`.

Names, brand/collection and pen counts sit below each swatch. Phones retain two columns and 44px arrangement controls. Only My Desk receives layout and typography changes; global navigation and other pages lose decorative copy while keeping functional instructions, reference descriptions and user data. Save-animation copy is reduced to “Saved.”

## Database migration

`20261018000000_named_palettes.sql` adds owner-scoped palette metadata and extends the existing items table with a palette ID. Existing positions migrate under `default`; the old RPC still reads/writes that arrangement for older clients. New `save_named_palette` and `delete_named_palette` RPCs use invoker rights, forced owner RLS, atomic validation, and cascading item cleanup. The collection snapshot includes all named arrangements. Applied migration files are unchanged.

Deploy the new migration through the existing Supabase integration before serving the new frontend. No hosted schema or production data is changed by this implementation. Local checks cover upgrade preservation, public reads, owner-only changes, independent saves, rename/delete, rollback, and unchanged inventory/history.

## UI and accessibility

Consulted the personal Impeccable skill at `~/.agents/skills/impeccable/SKILL.md`, its interaction/responsive references, and the repo's `.impeccable.md`. Retained Bodoni Moda/Figtree, warm paper and aubergine, with color reserved for actual ink swatches. Editor controls are disclosed through “Arrange palette”.

Pinned dnd-kit supports pointer/touch handles and Space → arrows → Space keyboard sorting (Escape cancels). The drag handle is the reorder control; visible arrow buttons are omitted. Handles and omit controls are at least 44×44 CSS pixels. Focus indicators, named controls, ink-name drag announcements, status messages, reduced-motion CSS, and stable focus after removal are included. Labels show ink name, brand, and collection separately from color.

## Local browser fixture

Run `VITE_SUPABASE_URL=https://synthetic.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic npm run dev -- --host 127.0.0.1`, then open `/tests/palette-preview.html`. The fixture starts publicly; sign in using any test email and nonempty password to enable its synthetic owner. Emails beginning with `fail` simulate rejected credentials. Named palettes persist in the tab's session storage, including order, omissions, names and deletion. Set `sessionStorage.setItem('synthetic-fail', 'true')` to simulate failed palette writes; remove it to retry. No real Supabase requests or writes occur. Use `?empty` for an empty desk.

This fixture verifies browser presentation and interactions only. The disposable PostgreSQL suite verifies database permissions and migration behavior; a local Supabase Auth/PostgREST instance is needed to verify those HTTP boundaries together.
