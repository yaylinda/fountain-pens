# Production deployment

GitHub Actions owns Vercel production releases. PRs run application tests, lint,
build, import tests and disposable PostgreSQL checks; they create no hosted
previews. The `deploy` job in `checks.yml` requires both check jobs to succeed
for the same main push. Manual check runs, tags, other branches and PRs cannot
deploy. It checks out the triggering SHA, serializes deployment, and rejects an
obsolete SHA immediately before publishing. A newer main push during publication
can finish afterward; serialization prevents an older job overtaking it.

Deployment is initially disabled. Repository variable
`VERCEL_PRODUCTION_ENABLED` must be exactly `true` to enable it. This switch is
not a substitute for review or production-environment protection.

## Setup before enabling

1. Confirm the account/team, project ID, owner, plan, limits and any costs in the
   Vercel dashboard. Use an eligible free Hobby project only after that check;
   do not start a trial, add a paid integration or buy a domain as part of CI.
   An empty connector team list does not establish a free plan or project access.
   If CLI authentication is absent, use `vercel login` in an operator terminal
   and finish its browser/device flow. Never paste credentials into chat.
2. Create/link the approved Vite project at repository root. Set Node.js 22.x
   (CI pins 22.16.0), output `dist`, install `npm ci`, build `npm run build`.
   `vercel.json` supplies these build settings. Do not launch `server.js` or
   configure Docker for this static deployment.
3. Leave the Vercel Git integration disconnected, or disable its automatic
   deployments before connecting. The committed `git.deploymentEnabled: false`
   is defense in depth for all branches; do not rely on it to prevent an import
   wizard's initial build or builds from older branches lacking this config.
   No other workflow, deploy hook or native Git integration should deploy this
   project. Confirm experimentally that a PR push creates no Vercel deployment.
4. Configure GitHub's `production` environment, limited to main with required
   review where available on the selected GitHub plan. Protect main with review
   and required `check` and `database` checks; prevent direct bypass. Store the
   approved Vercel deployment token using GitHub's secure environment-secret UI
   as `VERCEL_TOKEN`. Use minimum supported scope and expiry. Creating this
   persistent credential is a separate operator approval step. Connector OAuth
   and Vercel runtime OIDC do not supply CLI deployment authentication.
5. Set `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as production environment
   variables, copied from the approved project settings/linkage. These IDs are
   not secrets. Never guess them. The job verifies downloaded linkage matches.
6. Configure the following **Production** Vercel variables. They are public
   browser configuration, baked into the bundle; changing them requires a new
   build. The build guard requires Supabase's publishable-key format.

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Approved project's HTTPS `*.supabase.co` URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | That project's `sb_publishable_…` key |

   Never put a service-role/secret key, database password, Vercel token or other
   privileged value in any `VITE_` variable. Keep production credentials out of
   PR jobs. CI pulls environment configuration only in the protected deploy job,
   never uploads `.vercel` as an artifact, and removes it on completion.
7. Complete the application integration and separately approve/apply the
   additive Supabase migrations, approved owner's Auth setup/allowlist, exact
   production Auth redirect URLs, and fixed one-time JSON import. Use
   America/Chicago for collection dates. Verify recovery and RLS against the
   real project. Follow `supabase/README.md` and the design migration runbook;
   deployment performs no database reset, migration, import or seed operation.
8. Review the exact ready commit and target project. Enable the repository
   variable only when the coordinated release is approved, then push the
   reviewed main commit (or an approved empty release commit). Re-running its
   successful push workflow can also retry a failed deploy after setup fixes;
   it must still be current main. `workflow_dispatch` runs checks only.

The publish sequence is pinned CLI installation → `vercel pull
--environment=production` → configuration validation → locked dependency install
→ `vercel build --prod` → `vercel deploy --prebuilt --prod`. The GitHub summary
records the commit and deployment URL. Actions are pinned to commit SHAs and the
Vercel CLI is pinned to 62.2.0. Update these pins deliberately through review.

## Release verification

Inspect the exact deployment and commit in Vercel. Test `/`, `/pens`, `/inks`,
`/journal`, and the configured `/auth/callback`, including direct refresh and
query parameters. Only known client routes are rewritten; add new routes here
when introducing them in React Router. Unknown pages, `/api/missing`,
`/api/save-json`, `/assets/missing.js` and `/missing.css` must return 404, not app
HTML. Actual fingerprinted assets must have their correct content types and
immutable caching; HTML must revalidate. No private data belongs in the static
HTML or build output. If a Function is introduced later, explicitly configure
its private/no-store response caching instead of inheriting static policy.

Check login, logout/cache clearing, approved-owner collection CRUD, refill queue,
reload persistence and denial for anonymous/other users against the real Data
API. Inspect browser network/console errors and ensure legacy filesystem/Git
writes are absent. Record deployment URL, SHA, target project, verification
results and remaining limitations in the coordinated release report.

## Docker cutover and recovery

`build_and_push.yml` remains unchanged because homelab still uses it. Merging
this wiring with the enable variable unset does not replace the live app.
After Vercel passes the release checks, explicitly disable the old homelab
updater and old app writes, then disable **Build and Push Docker Image** in
GitHub Actions. Remove that workflow and obsolete deployment docs in the
coordinated cutover PR once rollback needs are settled. Do not leave GHCR and
Vercel as competing production release owners.

Before the first Supabase write, the fixed JSON backup is a recovery input.
After new writes, never restore service by pointing users at stale JSON.
Disable `VERCEL_PRODUCTION_ENABLED` to stop new releases; use an approved,
schema-compatible Vercel rollback if needed. A code rollback does not roll back
the database. Prefer a reviewed fix on main, preserve data, and follow the
separately verified Supabase recovery plan for database incidents.

References: [Vercel Git controls](https://vercel.com/docs/project-configuration/git-configuration),
[CLI login](https://vercel.com/docs/cli/login),
[prebuilt deployments](https://vercel.com/docs/cli/deploy), and
[environment variables](https://vercel.com/docs/environment-variables).
