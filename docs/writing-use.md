# Writing use

Base: `bc9d803fe311f5bb1136c0963502d3d0ca70c4e4` (current main, PR23). Branch: `codex/writing-use-log`. Initial verification used local synthetic data only. Release follows the existing reviewed PR, Supabase integration, and Vercel CI workflow.

## Schema decision

`public.writing_logs` has exactly:

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | `text` primary key, generated UUID text | Stable identity for correction/removal |
| `owner_id` | `uuid not null` | Existing collection owner; same RLS boundary |
| `refill_id` | `text not null` | Composite owner/refill FK to `refill_events` |
| `written_on` | `date not null` | Explicit writing day |
| `created_at` | `timestamptz not null default now()` | When the record was created, not when writing happened |

Unique `(owner_id, refill_id, written_on)` means one writing day per refill. Repeated Used today calls return the same record. This is a day log, not a session counter. Dates use the existing America/Chicago collection timezone. A selected date does not shift when viewed elsewhere. No notes, session duration, redundant pen/ink FKs, or mutable last-used column are introduced.

The refill identifies the pen and ordered ink mix. Separate pen/ink FKs would duplicate relationships and could contradict the refill or flatten mixed inks. Two fills with the same pen and inks remain distinct. Last written is the maximum explicitly logged date for that refill; refill creation does not create writing activity. Empty histories say “No writing logged.”

Deleting a log removes only that writing day. Deleting a refill with logs is restricted; remove its writing days explicitly first. Existing pen/ink restrictive deletion semantics remain. Refill corrections continue to define the pen/inks of linked writing history. A trigger prevents conversion to cleaning or moving the refill date after recorded writing. Writing dates must be on/after the refill and not in the future. The model deliberately does not invent times or guess which refill was active within a day.

## UI

Select a palette swatch, then choose the specific pen. Each pen/refill has Used today, derived last-written, and expandable writing history with backdating, correction and removal. A shared swatch never logs all its pens. Historical refills expose the same controls in Refill journal. Public readers see history; owner-only write controls and existing RPC/RLS authorization are preserved. Palette layout and drag/CRUD code are unchanged.

## Verification

- 70 application tests pass, including a focused writing-history interaction test.
- 13 importer/migration tests and 8 deployment tests pass.
- Disposable PostgreSQL harness passes: migration, public reads, owner/stranger/anonymous writes, daily deduplication, backdating, correction, date bounds, restrictive refill deletion, existing CRUD and mixed-ink integrity.
- Build and lint pass. Vite retains the existing large-chunk warning.
- Isolated synthetic Chromium flow: two pens sharing a swatch, Used today on only one refill, backdate/correct/remove, failed-save draft retention, public controls, no horizontal overflow at 390px.
- Desktop 1440px and mobile 390px screenshots were saved to Library for review and contain synthetic data only.

For the synthetic preview use `VITE_SUPABASE_URL=https://synthetic.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic npm run dev`, then `/tests/writing-preview.html`. Its fake sign-in accepts any non-`fail` test email and password. No hosted writes occur.

Hosted Auth/PostgREST and actual production deployment are untested. Publish the migration through the existing Supabase integration and Vercel CI after approval; do not apply it manually.
