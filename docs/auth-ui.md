# Collection access UI

The account entry point sits above the collection content on every route. It is visible on desktop and mobile, unlike the old sidebar footer, and stays secondary to browsing. Public visitors see **Public view / View only**. Only the existing database-approved `canEdit` capability produces **Owner mode / Editing enabled**. A signed-in account without that capability sees a view-only explanation.

**Owner sign in** expands a compact form in the page flow. It uses the existing typography, warm surfaces, aubergine controls, and field styles. Labels sit above equal-width inputs; the form fits the available width up to 400px. No modal or extra component library is needed.

Opening focuses Email. Escape, Cancel, and Close sign in clear the password and return focus to the trigger. Pending requests disable repeated submission and dismissal. Errors remain next to the form and are announced; focus returns after a disabled form loses browser focus. Sign-in success closes the panel and focuses Sign out unless the user has moved elsewhere. Sign-out uses the existing local scope and current-save guard. This change adds no signup flow, owner identity rules, schema changes, or auth policy changes.

## Verification

`npm run check` covers application tests, deployment checks, lint, type/build, importer tests, and the disposable local database harness. The synthetic auth UI test in `tests/supabase-runtime.test.tsx` covers public/owner/non-owner states, errors, loading, autocomplete, keyboard order, dismissal, focus restoration, password clearing, and sign-out.

For browser checks without hosted access, start this isolated fixture:

```sh
VITE_SUPABASE_URL=https://synthetic.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic \
npm run dev -- --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/tests/auth-preview.html#/pens`. Use only invented credentials: `owner@example.test` with any synthetic password succeeds; an email beginning with `fail` returns a sign-in error. The fixture refuses other environment configuration, intercepts synthetic Auth/collection requests, and rejects writes. It is not a production build entry point. It stores only a synthetic owner flag in session storage in addition to the SDK's synthetic session; sign out before finishing.

Visual checks used 1440×1000, 768×1024, 390×844, and 320×740 viewports. Inspect the entry point, panel alignment, visible labels, focus indication, error wrapping, and owner badge. A 320px viewport retains the app's existing 320px minimum document width; desktop scrollbar space can cause the existing page-level horizontal scrollbar. The account form remains within that width.

These local mocks verify presentation and interaction, not hosted Supabase compatibility. No real passwords, sessions, or live records are needed.
