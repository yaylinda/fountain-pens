# Collection details and source links

This change moves reference reads into the existing Supabase collection snapshot. It is a new migration of previously bundled reference data, not a repair of lost inventory. Production changes occur only after approval/merge and the existing Supabase integration deployment; the draft PR does not make the Waterman link live.

## Representation

- `pens.details` and `inks.details`: optional prose, stored as non-null text with an empty default.
- `pens.sources` and `inks.sources`: ordered JSONB arrays of `{label, url, supports?}`. Multiple product and reference URLs are supported. `supports` preserves existing field-level provenance. The SQL check validates the link shape and HTTP(S) URLs.
- `inks.reference`: nullable JSONB containing the existing typed manufacturer fields, except `description` and `sources`, which move into the shared fields above. This keeps Japanese names/meanings/aliases, author/work/series, product codes, color coordinates, effects, glitter colors, writing test observations/context, notes, edition and exclusivity together. Original `inkId` and `name` remain provenance; the inventory row ID owns the association after migration.
- `inks.swatch_reference`: nullable JSONB preserving the original InkSwatch `name`, `hex`, `url`, and `note` separately from the manufacturer's reference and Linda's custom color.

These documents are small per-item reference records, not a generic property/value schema. No extra joins, lookup tables, indexes, security roles, auth flows, refill RPCs, or concurrency machinery are needed. Existing inventory RLS and public reads apply to the new columns. The link validator is an invoker function with an empty search path and no access to user data.

## Runtime and editing

`get_collection` and CRUD responses include these fields. `collectionAdapter` preserves them, and `inkReference` reads the attached inventory record instead of importing catalogs. Search and Story & details retain the sourced content. Custom `colorHex` still wins, followed by manufacturer RGB, then the attached InkSwatch reference. Renaming an ink no longer loses its swatch association. A new unrelated ink with a matching name does not inherit a historical swatch.

Owner forms offer a collapsed Details & links section for descriptions and adding/removing/editing labeled URLs. Existing source `supports` notes survive edits. Public visitors see stories and clickable links without editing controls. Manufacturer facts and swatch provenance remain maintained through reviewed data migrations; ordinary CRUD intentionally cannot replace those documents. No raw JSON editor is added. Omitted details/links in an older client's RPC preserve existing values; explicit empty text/arrays clear them. Standard save failure handling keeps the form draft.

## One-time data migration

`20261003171529_seed_collection_references.sql` is generated from the preserved fixtures with:

```sh
node scripts/migration/generate-reference-seed.mjs
```

Do not regenerate or rerun an applied seed to update live data: it would replace edited descriptions/links. Use a new reviewed migration for later corrections.

The seed matches 21 Wearingeul and 15 Pilot references using stable text IDs and expected brands. `scripts/output.json` has 125 swatch catalog entries; 123 exactly match names in the fixed inventory snapshot. Those associations are frozen onto stable ink IDs in the migration. Every matched object's fields are copied, including null values and notes. The remaining two catalog records are retained in the offline fixture; no inventory is fabricated. All catalog headers (retrieval dates, policies, schema version) and the original documents remain intact as historical migration evidence.

The Waterman product URL is attached specifically to pen `3c8ab1e4-d304-460a-8d4d-54ae180adbb6`, with expected brand Waterman. Existing links are retained and the exact URL is not duplicated:

https://www.waterman.com/pens/l%E2%80%99essence-du-bleu/car%C3%A8ne-fountain-pen-lessence-du-bleu-gift-box/SAP_2166344.html

On populated inventories, missing targeted IDs or wrong brands abort the seed instead of silently losing an association. Empty fresh databases can apply all schema migrations without fabricating inventory. For a deliberate fresh restore, import the historical inventory first and apply the seed exactly once before owner editing begins. This is exercised in the disposable harness. Normal production deployment already has inventory and applies the seed once through migration history.

## Delivery and verification

Supabase's GitHub integration still owns schema deployment from main. GitHub Actions still waits for the exact-SHA integration check before deploying the app. These migrations must land before the new app. Rolling back the app is compatible because the previous RPC shape is accepted; retain the added columns and data.

- `npm test`: includes exact reconstruction of every original rich record through the runtime adapter, source display, no bundled fallback, owner link editing, invalid link feedback, and failed-save draft retention.
- `npm run test:migration`: asserts the committed seed is byte-for-byte reproducible from fixtures.
- `npm run test:db`: applies all migrations under a non-superuser migration role, imports the historical inventory, applies the seed, and deep-compares all 36 rich records and 123 swatch objects. Verifies Waterman, editing/clearing links, old-client preservation, brand mismatch rejection, existing public/owner access, and atomic multi-ink refill behavior.
- `npm run lint`, `npm run build`, `npm run test:deployment`, and `python3 -m unittest discover -s tests -p 'test_*.py'` cover remaining applicable checks.
- `node scripts/verification/visual-server.mjs` serves a synthetic collection on loopback port 5179. It intercepts all application requests and rejects unknown ones. Any email/password in the harness opens its synthetic owner mode; no real provider is contacted. It is not part of the production bundle. Use it to inspect public stories/Waterman links and owner forms at desktop/mobile widths.

These checks establish local behavior and PostgreSQL compatibility, not live hosted Auth/PostgREST or production deployment. After approved deployment, confirm 36 non-null ink references, 123 non-null swatch references (subject to deliberate later edits), and the exact Waterman URL through the public collection snapshot, and inspect the ink and pen pages. No production writes were performed during implementation.
