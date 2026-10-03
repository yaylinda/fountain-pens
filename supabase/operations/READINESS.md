# Hosted readiness review — deployment blocked

Reviewed main `8cbe712963db213974c0f00a9a25374bf5a73096` on 2026-10-03. PR12 was draft/unmerged at `de2e9054ba742d93947825d36c7ef3958cbe61c8`; do not deploy its SQL until parent review and merge. This report does not approve hosted application.

## Updated access requirement

The user now requires public browsing for everyone and Linda-only writes, with no public signup or browse login gate. This supersedes the private-read foundation and original PR12 design. Coordinate public SELECT grants/RLS on all four domain tables and the collection snapshot RPC with the app task. Keep owner configuration and import metadata private. Remove runtime mutation receipts, expected-version conflict handling, advisory-lock concurrency and recovery logic per the user’s explicit request. Prioritize straightforward single-writer CRUD, ordinary constraints/FKs and a small atomic multi-ink transaction. The app task owns these SQL/runtime edits; this readiness branch changes no migration. No live apply until this is synchronized.

## Historical findings — 2026-10-03, main 8cbe712

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
3. Verify migration versions and the actual reviewed minimal role model from the final SQL. Domain RLS and grants must permit public SELECT and Linda-only writes; private owner/import metadata must remain inaccessible to clients. Check direct-table and RPC access for anon, Linda and an unrelated authenticated identity. Check any privileged function’s owner authorization, safe search path and intended EXECUTE grants. Do not require the superseded collection_writer role, wrapper layout or FORCE RLS choices. Run both advisors and compare baseline findings.
4. Execute managed `auth.uid()` and role checks in a read-only transaction (`BEGIN READ ONLY`, `SET LOCAL ROLE authenticated`, transaction-local claims, SELECT only, `ROLLBACK`). An arbitrary synthetic UUID is not an authenticated session; label it correctly. Confirm stranger/null claims can browse the collection but cannot pass owner write checks. Test anon write denial independently. Do not insert synthetic collection rows.
5. Lowest-friction owner setup: parent opens the approved project’s Authentication → Users → Add user → Create a new user, then hands control to Linda. Linda enters her own email and password privately, keeps Auto confirm user enabled for her own account, and submits. Agents do not read/capture the password or operate the credential form. This creates the **application Auth user**, distinct from the dashboard account. Keep public signups disabled and email/password login enabled. Read back only the resulting UUID/email-confirmed status and have parent approve the owner binding. Invitation is an alternative only when the app already handles its callback and password setup; an invitation alone does not provide a password-setting screen. Do not add that flow solely for this one-user setup.
6. Register that UUID once in private.collection_owner with America/Chicago using a reviewed, target-bound operator step. No import until hosted schema validation and owner binding approval are complete.
7. Verify public PostgREST reads plus actual signed-in JWT owner write gating, including `/rpc/get_collection` after the runtime migration is merged. This requires the real app Auth session; SQL SET ROLE alone is insufficient. Keep tokens out of logs. Validate anonymous HTTP reads and write denial separately using only the publishable key.
8. Perform the one authorized import through a separately reviewed operator path, retain reconciliation/receipt evidence, then release the app and do user-coordinated real CRUD smoke tests. GitHub Actions must wait for the exact schema revision/readiness check; its disposable DB tests alone are not proof of hosted deployment. The parent owns the deployment gate and Vercel configuration.

## Import readiness

The fixed source snapshot's combined raw-file SHA-256 is `369692352fa2796aa7932ed7f87f3a5233291f8fd51c2751c9a8efdb1ca7aa58`: 50 pens, 194 inks, 486 events, 507 links. Preserve the three source files and review a fresh dry-run before import.

The currently merged `importLegacy` wraps its writes in one transaction with owner/empty-target checks, exact field/order reconciliation and sequence advancement. It also contains advisory-lock/receipt logic from the superseded design; do not perpetuate that generalized recovery model in new tooling. Keep one-time validation and the basic empty-target guard while coordinating simplification with the app task. `targetIdentity` is a receipt label, not proof of connection identity. The CLI is dry-run only.

The supported low-friction transport is native `execute_sql(project_id, query)` for the one-time data transaction; it uses the existing connector authorization, without a database password or public import RPC. The generator must still be adapted to the finalized simple schema and reviewed before executing. Do not split its transaction into independent execute_sql calls, upload data to a public RPC/build, or obtain a database password to work around this gap. A follow-up can generate one reviewed atomic SQL transaction from the same validated snapshot for an authorized connector, with reconciliation, target/owner guards, an empty-target check, and a synthetic atomic rollback test. Keep generated real-data SQL out of Git/public artifacts and logs. Use one call containing the complete transaction, not one call per statement: `BEGIN;` then a `DO` block with explicit approved owner/existence and empty-target guards, inserts, reconciliation and sequence advancement, then `COMMIT;`. Encode validated source values safely (for example collision-checked dollar-quoted JSON plus jsonb_to_recordset), never concatenate raw strings into SQL. Raise on any mismatch so no partial import commits. Return only summary counts/hash, not notes. On uncertain transport outcome, inspect rows before deciding any next action; do not add automatic replay infrastructure. Rehearse the exact generated transaction and an injected-error rollback locally. The tool schema accepts raw SQL without a declared query-size cap, but acceptance of this payload size is not yet verified. Do not silently chunk if rejected.

Native `apply_migration(project_id,name,query)` can execute the reviewed schema DDL through the same connector. Its tool contract does not accept an explicit migration version, so it cannot promise preservation of repository filename versions. Prefer the agreed GitHub schema integration; if parent selects MCP bootstrap instead, coordinate migration-history reconciliation before enabling integration. Keep collection data out of apply_migration/history: use execute_sql for the separately approved import. No hosted apply or import is authorized by this runbook.

Dashboard create-user form source: https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Auth/Users/CreateUserModal.tsx. Supabase user management: https://supabase.com/docs/guides/auth/managing-user-data.

The current Supabase changelog was reviewed, including PG17.11 breaking changes. This schema uses none of the identified legacy pgcrypto ciphers, ltree, btree_gist float indexes, or custom selectivity operators.
