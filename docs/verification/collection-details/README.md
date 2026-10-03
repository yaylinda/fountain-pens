# Synthetic browser verification — 2026-10-03

Rendered with `scripts/verification/visual-server.mjs` and an isolated agent-browser session. No hosted data or real Auth credentials were used. Desktop viewport: 1440 × 1000; mobile: 390 × 844.

- [Waterman desktop](waterman-desktop.png): public view shows the requested product link. Its href was read back and exactly matched the supplied encoded URL. The description is synthetic demonstration text, not migrated content.
- [Ink mobile](ink-mobile.png): Rikka's Japanese name, meaning, narrative, property observations, dry-time pen/paper context, and sources disclosure remain readable.
- [Owner mobile](owner-mobile.png): expanded descriptions and three source links; URL fields stack on narrow screens, existing provenance stays visible, save controls remain accessible.
- [Owner desktop](owner-desktop.png): expanded source editing alongside the existing story display.

Both mobile detail pages were inspected; document scroll width equals viewport width (390px). Public views have no editing controls. Synthetic owner sign-in reveals the details editor. The app tests separately exercise edits, malformed URLs, save errors/draft retention, and public source display; the database harness tests actual SQL persistence and permissions.
