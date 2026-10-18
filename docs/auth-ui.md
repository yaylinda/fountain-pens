# Collection access UI

Account controls live below the profile in the desktop sidebar and beside the wordmark on mobile. The full-width archive/date banner and account strip are removed. The page starts directly with its content or Collection subtabs.

Public visitors see **Public view** and **Owner sign in**. The database-approved `canEdit` capability shows **Editing** and **Sign out**. Other signed-in accounts see **View only**. This replaces the redundant owner badge plus editing explanation with one compact status.

Owner sign in opens a centered dialog, up to 400px wide, outside the sidebar. Opening focuses Email. Tab and Shift+Tab stay inside; the page behind it is inert. Escape, Cancel, Close sign in and clicking the backdrop dismiss it and clear the password. The dialog fits the viewport and scrolls on short screens. Pending requests prevent dismissal and duplicate submission. Errors retain entered values and restore focus; success returns focus to Sign out. Existing local sign-out scope and current-save protection are retained.

No authentication policy, owner identity, credentials, or signup behavior changes. Synthetic interaction checks cover owner/public/non-owner states, keyboard focus containment, dismissal, errors and successful sign-in/sign-out. Browser verification remains opt-in.
