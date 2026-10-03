# Vercel and Supabase delivery contract

Status: future implementation guidance; no project creation, credentials, deployment, DNS changes, or production writes authorized by this docs PR. See [architecture gates](client-api-postgres.md#direction-and-decision-gates) and [one-time import](supabase-migration.md#simple-delivery-sequence).

## Hosting and environment separation

Keep Vite build output on Vercel. The browser gets live collection data through Supabase; deployed JavaScript contains no mutable inventory/journal snapshot. An optional Vercel Function runs only an approved server-only operation. Do not migrate the long-running filesystem/Git server wholesale or rely on local function disk for persistence. No Next.js/SSR conversion is required. [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

| Environment | Data/Auth/Storage | Release policy |
| --- | --- | --- |
| Local/CI | Local Supabase or disposable isolated test database, test Auth identities and synthetic fixtures | Reset allowed only for known disposable target; run SQL and app checks. |
| Vercel Preview | Separate nonproduction Supabase project or isolated Supabase branch, with synthetic or explicitly approved sanitized fixtures | Preview URL/key and Auth redirects scoped to preview; never production write credentials or production data by default. |
| Vercel Production | Dedicated production Supabase project/bucket and approved owner | Protected release approval; controlled migrations; final import/cutover separate from ordinary deploy. |

Choose separate projects versus Supabase preview branches after checking availability, cost, and isolation for the selected plan. Never make isolation depend on a URL naming convention alone. Document target project IDs in operator configuration; verify them before privileged commands. Align regions sensibly, but approve actual regions/plans and Postgres/runtime versions during setup. No resource provisioning is performed now.

Scope Vercel Development, Preview, and Production variables independently. `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are baked into the browser at build time; changing them requires the corresponding rebuild/deployment. Privileged secrets are restricted to the controlled job or Function that needs them, never a blanket frontend environment. Scrub secret-bearing errors and ensure fork/untrusted PR builds cannot access privileged credentials. [Vercel environment-variable behavior](https://vercel.com/docs/environment-variables).

Register exact production and approved preview Auth callback URLs. Select and test the login provider before launch; if email magic links/OTP are chosen, configure a production-capable SMTP service and verify delivery/rate limits rather than assume the default mail service suffices. [Supabase Auth SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp). Disable self-service signup as recommended, keep the database allowlist authoritative, and test expired/revoked sessions and sign-out cache removal. No broad production redirect wildcard just to accommodate arbitrary previews.

## Build, routing, and CI

Use the existing package manager/lockfile and Vite build command; preserve `src/` layout initially. Pin the selected Supabase client/tooling package versions and commit their lockfile resolutions. Keep compatible supported runtime versions pinned consistently, without unrelated dependency upgrades. Remove the file API plugin, `/api/save-json`, legacy journal writes, network-detection authorization, and Git sync paths as client integration completes. Keep the old deployment available only for the deliberate pre-write rollback window.

Vercel route configuration must serve valid React Router deep links while preserving real asset and Function paths. Do not blindly rewrite every missing URL to `index.html`: missing JS/CSS/image requests must be 404s, unknown `/api/*` must be errors, and Auth callback routes must load the intended handler. Preserve immutable fingerprinted asset caching and HTML revalidation; private collection/Function responses must not enter a shared cache. Verify these cases in the deployed preview; existing HTTP tests alone validate only the legacy server.

Suggested release flow:

```text
PR -> app checks + SQL/RLS/RPC/import tests on disposable data
   -> build -> isolated Vercel preview -> smoke checks -> review

approved production release -> verify target + recovery point
                            -> serialized additive SQL migrations
                            -> verified candidate build/deployment
                            -> smoke checks -> promote traffic
```

Require checks before production promotion. Vercel's convenient Git integration must not promote an untested main commit while independent checks are still running: choose a supported deployment protection/promotion workflow or a protected CI-driven production deployment and verify that gate experimentally. Never run migrations in Vercel's build command, on a request, or on every cold start. One controlled migration job owns schema history; runtime serves requests only. The initial live import is a separate approved operator step, not a deploy hook.

Retire GHCR/Compose production publication and the homelab updater for this app only at authorized cutover; do not maintain two competing release systems. Current README/AGENTS homelab operations remain accurate for the old app until that transition. This repo then owns migrations, policies, application config/contracts and tests; operators own provider projects, credentials, domains, billing, access and recovery operations.

## Required verification before production

- SQL install/upgrade and constraints on the actual supported PostgreSQL version; approved owner read/write succeeds, stranger/anonymous direct table writes and RPCs fail. Test public invoker wrappers/private definer helpers, EXECUTE grants, fixed search path, owner-check helper, views, and inability to supply another owner or mutate server-controlled fields.
- Concurrent journal and pen changes serialize correctly; stale versions conflict; event/link/queue transaction failure rolls everything back; exact request replay cannot duplicate an event; distinct identical events remain possible.
- Import parity/idempotency/failure tests from the migration runbook; test population beyond API default row limits so collection reads cannot silently truncate.
- Existing desk, inventory, journal, filters, archived/favorite/queue workflows, color/reference stories, stable links, drafts, navigation, and save feedback. Test unavailable backend, lost mutation response, failed refetch after success, expired session, midnight/asOf rollover in the approved timezone, and two-tab stale editing.
- Preview routing/caching, login redirects, RLS through the actual Data API (not solely privileged SQL tests), bundle absence of secrets/mutable JSON, and owner data cleared on sign-out. Confirm a preview cannot write to production.
- If uploads are enabled: bucket/path/owner enforcement on download/upload/update/delete, size/MIME rejection, no public bucket leakage, signed URL expiry, failed metadata/object writes, orphan reconciliation and object restore. Otherwise document Storage as empty/deferred; do not add fake upload tests for a feature that does not exist.

Use `npm test`, `npm run lint`, `npm run build`, SQL tests such as `supabase test db`, and focused preview smoke tests once their code exists. Required test commands must point to local/disposable targets. This documentation change does not execute these future database/cloud operations.

## Recovery and rollback

Use additive, backward-compatible schema changes while a prior app release may need to run. Vercel deployment rollback changes application code, **not database schema or data**. Check schema compatibility before promoting a previous release; keep maintenance active and fix forward when it is incompatible. Do not automatically run down migrations or reset a database after a failed deploy.

Before enabling production writes, choose and verify a recovery policy appropriate to the selected Supabase plan: database backup retention/PITR availability, acceptable loss window, restore procedure, responsible operator, and a practiced restore to an isolated target. Do not assume a paid-plan capability exists or promise zero data loss. Capture a verified recovery point before destructive migrations and approve any destructive change separately. Recovery must include Auth/application access configuration where required by the chosen restore method.

Supabase database backups do not include Storage object bytes; object metadata alone cannot restore uploaded photos. If there are uploaded objects, back up/restore the bytes separately and reconcile bucket/path/checksum metadata. With today's no-media snapshot, document that the object set is empty instead of inventing a backfill. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups).

Before database writes, the fixed JSON backup is a recovery input. After database writes begin, use database recovery or a compatible app rollback; do not return to stale JSON and lose new writes. There is no reverse-sync implementation or live-writer freeze choreography.

## GitHub Actions and Vercel implementation scope

The rewrite includes updating GitHub Actions, not only changing persistence. Current `checks.yml` runs app tests/lint/build and now a separate disposable database job for source validation, schema/import/RLS/RPC/rollback checks on PRs and main pushes. These checks need no cloud secrets.

For the hosting slice, use **GitHub Actions as the single deployment owner**: PRs run CI against local/disposable test databases; after a reviewed merge to main and passing checks, deploy/promote production through its protected environment. Hosted PR previews are optional future work, not a release blocker. If added, they must use isolated nonproduction Supabase configuration. Disable duplicate automatic Vercel Git deployments if Actions owns deployment. Confirm the workflow and branch/environment protections before enabling it; do not rely on two competing triggers.

Keep production Vercel and Supabase secrets out of PR test jobs; if hosted previews are later added, scope their configuration separately; fork PRs must not receive deployment credentials. Project creation, token configuration and production import/deployment remain separate authorized operations. Retire `build_and_push.yml`, GHCR production publication and the homelab updater only when Vercel is ready and serving the app. The current Docker workflow remains needed by the live JSON app and is unchanged in this database slice.
