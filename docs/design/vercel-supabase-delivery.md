# Vercel and Supabase delivery

The implemented release contract lives in [production operations](../deployment.md) and [checks.yml](../../.github/workflows/checks.yml).

| Environment | Data and execution | Release policy |
| --- | --- | --- |
| Local/CI tests | Mocked HTTP/Auth and a labeled disposable PostgreSQL container with synthetic identities | No production credentials or data writes; `npm run check` runs the aggregate checks. |
| Pull requests | Application and database CI | No hosted previews or production deploys. |
| Production | Vercel Vite SPA and approved Supabase project | GitHub Actions releases checked main SHA after successful exact-SHA Supabase integration check. |

Supabase's GitHub integration owns schema deployment from main. Vercel's native Git deployments are disabled; Actions owns application releases. The deploy job verifies project linkage and the two allowed public browser variables, builds the triggering SHA, serializes publishing and rejects obsolete main commits. It never runs a database migration, seed or import.

Known client routes are rewritten to the SPA; unknown API and asset paths remain 404. Fingerprinted assets are immutable; HTML revalidates. Public reads and owner-only writes use Supabase directly. Only email/password owner sign-in is implemented; there is no public signup or upload feature.

The legacy container deployment has been retired from the repository. External hosts/resources are outside this cleanup. Retained Docker usage is only for disposable database tests. Recovery uses a schema-compatible Vercel rollback or a reviewed fix and the separately verified database recovery procedure. Historical JSON is not a current production backup.
