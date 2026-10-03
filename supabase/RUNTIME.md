# Supabase browser runtime

The React/Vite UI now reads live data through Supabase. The fixed JSON snapshot remains exclusively an offline importer input. No project, credentials, owner, live import or deployment is created by this change.

## Setup contract

Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (a `sb_publishable_` key), as shown in `.env.example`. These are public browser build inputs. Secret/service-role keys and privileged credentials are rejected and must never enter Vite config. Missing config shows a setup error; there is no JSON fallback. Production setup must disable public signup, administratively establish the approved email/password Auth owner, apply reviewed migrations and populate the single-owner allowlist. The UI exposes sign-in only. Choosing OAuth/OTP later is separate; it is not necessary for this client path.

`@supabase/supabase-js` is pinned to 2.109.0 with its lockfile. The official changelog was read on 2026-10-03. Relevant changes include explicit Data API grants and PostgreSQL 17.11; migrations grant execution/select explicitly and disposable tests use 17.11. No extension, Realtime, middleware or Storage upload features are used. References: [changelog](https://supabase.com/changelog), [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [functions](https://supabase.com/docs/guides/database/functions).

## Read and mutation behavior

`get_collection()` is an owner-gated, invoker-rights, stable snapshot RPC. It returns one JSON aggregate containing all pens, inks, ordered events/ink links and Chicago `asOf`; PostgREST's usual row count limit cannot truncate its arrays. No private owner/import/receipt rows are exposed. Adapter validation checks relationships and versions. Bigint versions/sequences remain strings, and sequence comparisons use `BigInt`. Journal routes and keys use stable event IDs; old numeric bookmarks are not guessed. Current-date derivation uses America/Chicago and updates on focus and every 30 seconds. Manufacturer catalogs and color precedence are unchanged.

`create_pen`, `update_pen`, `delete_pen` and ink equivalents are additive, narrowly scoped inventory RPCs. Full replacement updates require the captured version and increment once. Archive/restore are versioned updates, preserving journal links. Foreign keys reject deletion of referenced inventory. Validation rejects owner/ID/version injection and invalid types/colors. Private command functions follow PR10's non-login, non-BYPASSRLS writer role, fixed search path, explicit owner checks, advisory lock and durable retry receipts; public wrappers are invokers. There are no new direct browser DML grants.

Refills call PR10's real atomic `create_refill_event`, `update_refill_event` and `delete_refill_event` RPCs. Ink order, cleaning and residual-ink semantics are preserved. Creation passes cleaning queue intent in the same transaction; no second pen request follows a refill. Edits/deletes preserve today's queue intent.

The owner-scoped memory cache publishes only confirmed mutations and refreshes after commit, focus and reconnect. Failed post-commit refresh shows “Saved” plus a refresh warning and retains the confirmed result. Stale read responses cannot repopulate a signed-out or switched account. Editors retain drafts on rejected writes; conflicts offer a latest-saved review and an explicit choice to keep the draft using the reviewed version. A lost response keeps the same request UUID and immutable payload for retries, and blocks unrelated writes until resolved. A recovery control can resolve the receipt and reopen the collection if the original editor was left. No blind new-ID create retry occurs.

Request IDs, drafts and pending outcomes are memory-only. A browser reload/close discards them: heed the unsaved-form warning and resolve an uncertain write first. After a reload, inspect the collection before deliberately creating another identical event. No sensitive drafts are stored in localStorage or browser history; history stores opaque draft keys. Explicit sign-out/account change unmounts editors and clears owner data. Automatic session loss hides the editor, clears the collection cache, and keeps its in-memory draft for reauthentication to the same account; a different account remounts it. Auth sessions themselves use Supabase's normal persisted browser session handling.

## Verification and remaining cloud checks

Run `npm test`, `npm run lint`, `npm run build`, `npm run test:migration`, `npm run test:db`. Existing CI commands include the new tests automatically; this chunk does not change deployment workflows.

- App tests use the actual pinned Supabase client with synthetic HTTP/Auth responses, validating configuration, adapter limits/order, deduplicated reads, stale response suppression, commit versus refresh errors, lost-response receipt replay, atomic refill requests, auth/session clearing and draft recovery. Existing UI workflows now exercise RPC-shaped fixtures, stable identities, nested drafts, favorites, archive/restore, filters, queue and journal behavior.
- Disposable PostgreSQL tests apply all migrations, verify the read contract beyond 1,000 records, owner/stranger/anonymous permissions, inventory replay/version/validation/archive/delete behavior, and the existing import/refill/rollback/concurrency checks. They use Auth role stand-ins and are not hosted Supabase tests.
- `database.types.ts` is a reviewed RPC contract, **not** a generated hosted schema. Generate provider types and compare them during managed-project rehearsal.

Still required before production writes: real Auth/JWT/PostgREST calls, managed grants/roles and advisors, actual owner bootstrap and password setup, one-time import reconciliation, and deployed browser CRUD smoke tests. The parent setup/deployment tasks own those checks. No Storage media is enabled.

The legacy Express server and file API fixture tests remain solely for the old deployment's separate retirement. `src/main.tsx` and Vite no longer import the file writer, LAN context, dirty-sync state or Git push dialog. Do not re-enable those endpoints in the new runtime.
