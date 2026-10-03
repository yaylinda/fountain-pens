# Offline reference and verification tools

- `inkswatch.py`, `inkNames.json`, `output.json` and `output.csv` generate/preserve approximate swatch reference data from InkSwatch. The reference migration attaches matching `output.json` records to ink IDs; the app reads those records from Supabase. These fixtures are not live inventory writes. Run the scraper deliberately with `uv run inkswatch.py` from this directory, review generated reference changes, and retain provenance.
- `pilot_reference.py` and its Python test preserve manufacturer catalog extraction; see [Pilot reference](../docs/pilot-reference.md). `src/data/pilot-inks.json` and `wearingeul-inks.json` remain historical migration fixtures, not runtime imports. See [collection details](../docs/design/collection-details.md).
- `migration/` reads the fixed inventory/journal snapshot for import validation and disposable database tests. See [migration reproducibility](../docs/design/supabase-migration.md). It is not a runtime JSON API or live sync job.
- `deployment/` validates Vercel public configuration and waits for the exact-SHA Supabase integration check. `npm run test:deployment` exercises these release gates.

Python reference utilities use `pyproject.toml` and `uv.lock`. JavaScript tools use the root npm lockfile. Docker is required only for `npm run test:db`; `npm run check` includes it with the application and deployment checks.
