# Application review and redesign

## Scope

Reviewed the application entry points, all inventory/refill components, contexts, models, services, CSS, application configuration, and the three source JSON collections. Inspected the existing swatch reference and its role in the UI. Deployment, Claudia, server infrastructure, and git synchronization implementation are excluded as requested.

The original source contains 48 pens, 194 ink records including the `NONE` placeholder, and 436 journal events. These files remain unchanged by this work.

## Findings addressed

| Finding                                                        | Effect                                                                          | Change                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Brand, model, and nib labels used unrelated hashed colors      | Strong color competed with the actual ink information                           | Restrained typography and reference ink swatches                                                 |
| Inventory editing used centered dialogs over dense tables      | Little context while entering or correcting details                             | Dedicated workspaces with a live summary and related history                                     |
| Free-text autocomplete values were not consistently captured   | Newly typed brand/model values could be omitted unless committed as a selection | Controlled text fields with optional existing-value suggestions                                  |
| Refills used long unsearchable selection menus                 | Finding one item among nearly 200 inks was cumbersome                           | Searchable radio/checkbox lists with visible selections and mix support                          |
| Refill history and inventory maintained separate derived state | Duplicated calculations and inconsistent presentation                           | A shared typed collection model refreshed after each mutation                                    |
| Latest pen ink only used the first member of a mix             | Remaining inks were hidden from a pen's current pairing                         | All selected inks are displayed and counted separately                                           |
| `NONE` was treated as an inventory item and refill             | Inventory and usage totals included a cleaning placeholder                      | Explicit cleaning events, empty state, and separate refill totals                                |
| Same-day chronology lacked a deterministic last-entry rule     | A later cleaning or fill could fail to become the current state                 | Date order plus original array position as tie-breaker                                           |
| Deleting inventory could leave unsafe joined references        | Historical rows could crash or become ambiguous                                 | Archive used items, preserve history, and render fallback labels for existing missing references |
| Display indices could leak into saved refill objects           | Source records accumulated view metadata                                        | Serialize only date, pen ID, ink IDs, and notes                                                  |
| Fixed-height tables and hidden overflow constrained the layout | Awkward scrolling and poor small-screen use                                     | Natural page scrolling and responsive inventory rows                                             |
| Generic scaffold styling and globally conflicting themes       | Inconsistent hierarchy and visual appearance                                    | Unified paper/aubergine palette, self-hosted type, and shared UI primitives                      |

## User flows

1. The desk prioritizes latest pairings and offers **Log a refill**.
2. Every inventory item opens a consistent details/edit workspace; history links open the corresponding journal entry.
3. Refill entry supports one ink or a mix, a last-pairing shortcut, and a separate cleaning choice.
4. Creating an inventory item during a refill preserves the date, pen, inks, and notes. The resumed refill remains protected as an unfinished draft.
5. Navigation and cancellation protect edited drafts; refresh/closing the tab uses the browser's standard unsaved-change protection.
6. Archiving preserves identity and journal links. Deleting a journal entry updates derived pairings immediately.

## Data boundaries

Inventory JSON is not rewritten during implementation or testing. Optional archive and swatch fields require no migration. Existing persistence, network permissions, and sync review remain in place. The pre-existing Vite JSON read endpoint and data-service change that propagates failed loads are retained as application prerequisites, so a clean checkout can load its inventory and retry errors. Other existing infrastructure changes are excluded from the redesign commits.

The dashboard describes current pairings as inferred from the latest recorded entry. It does not infer whether a pen has physically run dry. Source swatches are approximate, and inks without a known reference are not assigned invented colors. Same-day array order is the available tie-breaker because existing events have dates but no timestamps.

## Validation

- TypeScript compilation and Vite production build: passed.
- ESLint; the existing two Fast Refresh warnings in the network and dirty-state contexts remain outside the redesign.
- 22 passing automated tests, including domain tests for mixtures, cleanings, archive counts, deterministic ordering, deletions, calendar dates, search, missing references, payloads, and real source-data integrity.
- Isolated DOM interaction tests for load retry, new free-text inventory values, edits/cancellation, creating ink during refill entry, filtered entry editing, cleaning/deletion, archive/restore, and accent-insensitive search.
- Read-only local HTTP checks confirmed the inventory API returns all three source collections and both self-hosted WOFF2 fonts load.
- Static responsive/accessibility review: semantic navigation, labels, focus outlines, keyboard-operable choices, explicit empty/error states, reduced motion, and small-screen layouts.

No browser or screenshot verification was performed, following the repository's explicit opt-in policy. The automated DOM tests verify behavior, not browser layout; a visual browser pass remains available when requested.
