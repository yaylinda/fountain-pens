> Historical pre-release record (2026-10-03, PR12). The pending setup/import statements below describe that point in time, not current release blockers or instructions to rerun the import. The app is now live and Linda manually validated login and updates. Keep the hashes and rehearsal evidence for audit; current operations are in [deployment.md](../../docs/deployment.md) and [RUNTIME.md](../RUNTIME.md).

# Hosted release readiness

Updated 2026-10-03 for merged PR12, commit `8235b955a1cdb3a0b29a01a7bd8b622ff45bd690`.

## State at the recorded revision

The application supports public collection browsing, including displayed journal notes, with Linda-only writes and no public signup. Runtime mutations are straightforward CRUD, with an atomic transaction for multi-ink refill changes. Custom writer roles, expected-version conflicts, runtime retry receipts, advisory locks and session draft recovery have been removed.

The approved Supabase project is `dtdzbjxrqsrhfifxsebi`, PostgreSQL 17.11. The owner created her application Auth account privately and its email was confirmed; public signup is disabled. No password or token is stored in this repository. Owner binding is part of the separately reviewed one-time import operation.

Production GitHub integration is enabled for `main`, working directory `.`, with automatic branching disabled. Enabling it after PR12 merged did not replay that commit: the latest read-only check still found zero migrations and zero public tables. This readiness update supplies the next meaningful repository push. Confirm the resulting integration deployment before importing data or releasing the app.

## Reviewed migration manifest

The following SQL was reviewed and rehearsed. It is unchanged between implementation revision `2219a916`, final PR12 head `41481a2`, and merged commit `8235b95`.

| Version / file | SHA-256 |
| --- | --- |
| `20261003031321_collection_foundations.sql` | `c2d477d52424d2b596810246d0c0ff26536ff9836964402f7aa67035f4a5e6f6` |
| `20261003032129_refill_commands.sql` | `5a01c551e8b8a92822f7cbd4cfd2d48d73e6ea19c61701053ac0e6f33e7ac22b` |
| `20261003034609_collection_runtime.sql` | `760e234474f10a445cf724e51e7bb9b2a590c7a2b6b39a50ed3592cd9c38edab` |

All three migrations installed on disposable PostgreSQL 17.11 as a non-superuser database owner with BYPASSRLS and ordinary Auth access, without Auth grant options. The old foundation's custom-role SET membership, schema CREATE and delegated Auth-access failures are resolved by removing that role model. The only application definer helper, `private.is_owner()`, returns a boolean; mutation and snapshot functions run as the caller. Domain RLS permits public reads and restricts writes to the configured owner.

This local rehearsal uses an Auth stand-in and synthetic claims. It does not replace hosted Auth/JWT/PostgREST checks.

## Integration and post-deployment checks

Supabase's [GitHub integration documentation](https://supabase.com/docs/guides/deployment/branching/github-integration) states that pushing or merging to the configured production branch applies new files from `supabase/migrations`. Production API/Auth configuration and seeds are ignored by default. `config.toml` is documented for configuration, Edge Functions and Storage resources; none are being deployed here. No requirement for a config file for this migrations-only deployment was established, so this change adds no speculative configuration or hosted Auth overrides. If the integration reports a missing-config error, resolve that specific error before proceeding.

1. Confirm integration success and exactly the three migration versions above, in order. Do not duplicate them with MCP `apply_migration`, which does not expose an explicit version argument. Do not modify applied migrations.
2. Verify the four domain tables have RLS, public SELECT grants/policies and owner-only write policies. Verify the two private tables have RLS and no anon/authenticated table privileges. Confirm only intended function EXECUTE grants, the helper's safe search path, and caller-rights mutation functions.
3. Run security and performance advisors. The pre-schema baseline already flagged provider-created `public.rls_auto_enable()` as executable SECURITY DEFINER for anon/authenticated; performance advisors were clear. Compare new findings without silently dropping provider objects. [Security finding reference](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
4. Check public `/rest/v1/rpc/get_collection` and table reads using the publishable key, then real owner Auth/JWT behavior through the app. Read-only SQL role/claim checks supplement these tests; they are not a real login. No synthetic collection rows should be written in the hosted project.
5. Parent approves the one-time import after hosted schema validation. Keep the Vercel app release coordinated with that readiness; local database CI alone does not establish hosted deployment success.

## One-time import prepared

The fixed source snapshot is unchanged: combined raw-file SHA-256 `369692352fa2796aa7932ed7f87f3a5233291f8fd51c2751c9a8efdb1ca7aa58`, with **50 pens, 194 inks, 486 events and 507 links**. Preserve the three source JSON files.

An operational generator and SQL payload are held outside Git. Reviewed SQL SHA-256 is `53f764f723f08329272b0ced43ffc8cb9810df78285adfe709e64f7d11d62fbb`, 149,737 bytes. It checks the approved confirmed Auth owner and empty target, binds the owner if absent, inserts the validated snapshot, reconciles every mapped field and ordered link, records a basic import audit marker, and advances the event sequence. It contains no automatic replay or concurrency framework.

Local rehearsal passed exact reconciliation, an injected-error rollback of collection/owner/audit rows, rejection of a populated target, public snapshot reads and owner/stranger access checks. The next event sequence is 487. PostgreSQL `setval` is not transactional: a later failure can leave a harmless sequence advance even when rows roll back.

Execute the complete reviewed transaction in one native `execute_sql` call with the explicitly approved project ID, using existing connector authorization. No database password or public import RPC is needed. Do not split the transaction across calls. Connector acceptance of the full payload size and actual hosted import remain untested. If a response is uncertain, inspect the resulting state before any further action. Keep generated SQL, passwords and tokens out of Git, build artifacts and logs; return only reconciliation summaries.

No hosted import has occurred as of this update. Historical role findings from the pre-PR12 schema are not outstanding blockers for the revised SQL.
