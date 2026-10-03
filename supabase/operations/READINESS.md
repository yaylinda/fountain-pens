# Hosted readiness review — deployment blocked

Reviewed main `8cbe712963db213974c0f00a9a25374bf5a73096` on 2026-10-03. PR12 was draft/unmerged at `de2e9054ba742d93947825d36c7ef3958cbe61c8`; do not deploy its SQL until parent review and merge. This report does not approve hosted application.

## Updated access requirement

The user now requires public browsing for everyone and Linda-only writes, with no public signup or browse login gate. This supersedes the private-read foundation and original PR12 design. Coordinate public SELECT grants/RLS on all four domain tables and the collection snapshot RPC with the app task. Keep owner configuration, import and mutation metadata private. Do not introduce additional concurrency/retry infrastructure; prioritize simple single-writer CRUD and atomic multi-ink integrity. No live apply until this is synchronized.

## Verified target and blockers

Connected Supabase read-only checks against approved project `dtdzbjxrqsrhfifxsebi` found PostgreSQL 17.11, zero public tables, zero Auth users, and real `auth.uid()`. `postgres` has CREATEROLE/BYPASSRLS but is not superuser. It can reference `auth.users`, but lacks grant option for both auth schema USAGE and auth.uid EXECUTE.

The foundation therefore needs a coordinated role-model correction **before first application**:

1. A PG17 non-superuser role creator does not automatically obtain SET membership in its new role. Foundation fails at the first ALTER FUNCTION OWNER with `must be able to SET ROLE collection_writer` in a disposable PG17.11 reproduction.
2. After membership is addressed, the target owner needs CREATE on the containing schema during ownership transfer; current migrations grant only USAGE. Scope any CREATE grant to the migration transaction, revoke afterward, and apply the same pattern to refill and pending inventory private functions.
3. The grant of auth schema USAGE to collection_writer cannot be delegated by hosted postgres. The disposable reproduction emitted `no privileges were granted for auth` and `uid`. Explicit EXECUTE may already be inherited from PUBLIC, but auth schema access is still missing. Coordinate the simplest owner-checked command design with PR12; any privileged function must enforce the approved owner and a safe search path. Changes to the definer ownership model need explicit review and managed validation. Granting an existing role's membership has wider implications and requires review of effective privileges.

The synthetic reproduction used only a temporary Docker PostgreSQL instance, with auth/roles approximating observed managed ACLs; it was deleted afterward. It is evidence for PostgreSQL permission failures, **not** full Supabase compatibility verification. No hosted DDL, rows, account, credentials, or import were created.

Security advisors already report `public.rls_auto_enable()` executable SECURITY DEFINER for anon and authenticated on this otherwise empty project. Investigate the provider-owned event trigger and its ACL separately; do not silently drop it or broaden the app migration. Performance advisors returned no findings.

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://www.postgresql.org/docs/17/sql-alterfunction.html
- https://www.postgresql.org/docs/17/sql-createrole.html

## Reviewed migration identity (not deployable yet)

| File | SHA-256 |
| --- | --- |
| `supabase/migrations/20261003031321_collection_foundations.sql` | `dfeb197966f6067e8382d4c8a7b9b37202ee4b9562abcaf9c9905ee60aebbaec` |
| `supabase/migrations/20261003032129_refill_commands.sql` | `4ad74d84de2219201e62cdd0abc83a00d66e97d64cae017b8baa17f9516ff71b` |

A later additive fix cannot rescue an earlier migration that fails. Since this target has no applied migrations, coordinate repair of unpublished foundation SQL with all branches and regenerate this manifest after review. Do not silently edit any migration applied elsewhere.

## Coordinated release sequence

1. Keep production integration disabled and app deployment held. Fix the blockers with a non-superuser install regression and the full disposable database suite. Resolve PR12 overlap and inspect fresh main/migration history.
2. Parent reviews the exact merged SQL, commit and SHA-256 manifest. Confirm project identity and empty history immediately before application. Use a single schema deployer: recommended GitHub integration after parent explicitly enables it. Do not also apply the same migrations with MCP; preserve canonical migration versions. If integration is unavailable, agree on a migration-history-preserving alternative first.
3. Verify every migration version, four domain tables with forced RLS, three private tables with RLS, SELECT-only anon/authenticated domain access under explicit public-read policies, no client private table access, command EXECUTE grants, invoker public wrappers, private definer owner `collection_writer`, empty search paths, no writer login/BYPASSRLS/schema CREATE, and no client SET membership in writer. Run both advisors and compare baseline findings.
4. Execute managed `auth.uid()` and role checks in a read-only transaction (`BEGIN READ ONLY`, `SET LOCAL ROLE authenticated`, transaction-local claims, SELECT only, `ROLLBACK`). An arbitrary synthetic UUID is not an authenticated session; label it correctly. Confirm stranger/null claims can browse the collection but cannot pass owner write checks. Test anon write denial independently. Do not insert synthetic collection rows.
5. User creates the sole **application Auth user** using Supabase Auth invitation and completes the private email flow to set their own password. Parent configures allowed app redirect URLs, email/password provider, and disables public signups. Never request the password or confuse the Supabase dashboard account with `auth.users`. Resolve the resulting UUID through approved metadata and have parent approve the owner binding; do not invent one or automatically create OAuth grants.
6. Register that UUID once in private.collection_owner with America/Chicago using a reviewed, target-bound operator step. No import until hosted schema validation and owner binding approval are complete.
7. Verify public PostgREST reads plus actual signed-in JWT owner write gating, including `/rpc/get_collection` after the runtime migration is merged. This requires the real app Auth session; SQL SET ROLE alone is insufficient. Keep tokens out of logs. Validate anonymous HTTP reads and write denial separately using only the publishable key.
8. Perform the one authorized import through a separately reviewed operator path, retain reconciliation/receipt evidence, then release the app and do user-coordinated real CRUD smoke tests. GitHub Actions must wait for the exact schema revision/readiness check; its disposable DB tests alone are not proof of hosted deployment. The parent owns the deployment gate and Vercel configuration.

## Import readiness

The fixed source snapshot's combined raw-file SHA-256 is `369692352fa2796aa7932ed7f87f3a5233291f8fd51c2751c9a8efdb1ca7aa58`: 50 pens, 194 inks, 486 events, 507 links. Preserve the three source files and review a fresh dry-run before import.

`importLegacy` uses an authorized connected client and wraps lock, owner/empty-target checks, inserts, exact field/order reconciliation, sequence advancement and receipt in one transaction. Matching receipts make retries no-ops; conflicting receipts/populated unmarked targets abort. `targetIdentity` is a receipt label, not proof of connection identity. The CLI is dry-run only.

No safe connected execution adapter currently bridges this library to MCP. Do not split its transaction into independent execute_sql calls, upload data to a public RPC/build, or obtain a database password to work around this gap. A follow-up can generate one reviewed atomic SQL transaction from the same validated snapshot for an authorized connector, with equivalent reconciliation, target/owner guards, receipt semantics, and synthetic rollback/retry tests. Keep generated real-data SQL out of Git/public artifacts and logs. Until that adapter is implemented and reviewed (or another authorized connection is provided by the platform), actual import remains blocked.

The current Supabase changelog was reviewed, including PG17.11 breaking changes. This schema uses none of the identified legacy pgcrypto ciphers, ltree, btree_gist float indexes, or custom selectivity operators.
