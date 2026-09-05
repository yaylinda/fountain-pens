# Save ceremony

Run `npm run dev -- --port 5177`, then open `/tests/ceremony-preview.html` for a non-writing rehearsal. Replay runs the actual production animation; phase controls freeze it for artwork inspection. Reduced motion previews the static alternative. This development-only HTML is not a Vite production entry point.

In the app, successful pen, ink and refill JSON writes trigger the ceremony. Data tools > Review changes to sync > Confirm & Push triggers it only when both HTTP status and the GitHub sync response confirm success. Existing editor navigation remains immediate. A pointer-transparent Saved marker retains the source button position after navigation. Keyboard form submissions use the form submit button as the destination.

The event bridge is small; `inkCeremony` imports only after success. Save persistence never awaits animation loading. App unmount, replacement celebration, Escape, resize and motion preference changes remove the canvas and cancel its animation frame and timers. Reduced motion uses only a short status message. No sound, focus movement or input interception.

Timeline (milliseconds from start): paper arrival 0–380, signing 500–1600, pen set aside 1600–1900, seal arrival/lift 1800–2250, ink-pad dip 2250–2440, transfer and impact 2440–2770, lift and tool exit 2890–3400, burn 3400–3700 (300 ms), black ink to gold 3700–3900, crumble 3900–4100, swirl to Save 4100–4700 (600 ms), cleanup 4950.

Validation: `npm run build`, `npm run lint`, `npm test` with Node 22. Tests use isolated fixtures and verify confirmed-success gating, HTTP/network failures, focused-button coordinates, reduced motion, Escape/preference cleanup. Browser rehearsal covers signature, impact, burn, gold ink and particles without modifying inventory.
