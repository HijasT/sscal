# Kleon

Kleon is my sales-incentive calculator and Sale Assistant for the team. I built it to do one job well: work out everyone's incentive from a monthly Excel sheet, and help whoever is in front of a customer pick the right health package — without any of our numbers ever leaving the browser.

Everything runs locally. There is no backend, no database, no login, and no analytics. I don't want staff pay or customer selections sitting on a server somewhere, so the app does every calculation in your browser and forgets the data an hour after you last touched it. The header's "100% local · no data shared" line isn't marketing — it's a constraint I hold the code to.

## What it does

- **Bulk incentives** — drop in the monthly team Excel and get everyone's payout at once, by month, quarter, half or year. It reads our actual sheet layout (TARGET cell, month-total column, staff blocks), handles the SOP cases (NA/N·A = absent, blank = 0 sales, `#REF!` = flagged), and surfaces anything it can't trust in a pop-up instead of a card people scroll past.
- **Individual calculator** — the same tier + P1/P2 pool math for one person, by hand.
- **Sale Assistant** — browse the full package catalogue, see each package's components (down to the blood-tube count and consultation time), compare any two packages, and climb the "Package Ladder" to the cheapest bundle that covers a customer's selection. HEALTHMAXXING is our gender-specific catch-all.
- **Settings** — tiers, staff-centre allocation, USD display and the "keep data on this device" switch, all stored locally.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (also type-checks)
npm test        # calculation + catalogue tests
```

Deployed on Vercel. The security headers (strict `connect-src 'self'` CSP, HSTS, no source maps) are the backstop for the "nothing leaves the browser" promise.

## Privacy, in one line

All data is stored locally in your browser — no server, no database — and auto-expires after an hour. Your calculations and settings never leave your device.

## Version history

- **v11** — Per-package discount caps, step-by-step Excel upload instructions, collapsible Settings, all warnings/errors unified into one pop-up, richer package details (components, blood tubes, consultation), sticky catalogue search, and gender-specific HEALTHMAXXING.
- **v10** — Renamed to Kleon. Removed Analytics; added 1-hour local data auto-expiry with a "keep on this device" option; Sale Assistant became the first tab; editorial design polish.
- **v9** — Sale Assistant matured: the Package Ladder, cheapest-bundle suggestions via a package-composition graph, HEALTHMAXXING, the Men/Women toggle, and accessibility fixes.
- **v8** — Live Individual calculator, auto-calculating Bulk with Center-wise stats and staff-centre allocation, and the first Sale Assistant (catalogue, quotes, per-line discounts).
- **v7** — Next.js foundation hardened: central config, Excel/PDF bundled without CDNs, light theme by default, working-days fix.
- **v6** — Consolidation on the new architecture — central configuration, chronological month handling, and a recoverable error boundary around the Bulk tab.
- **v5** — Migrated from the standalone HTML build into the modular Next.js + React + TypeScript app, deployed on Vercel; self-hosted fonts, dark/light themes.
- **v4** — Analytics introduced (team history, scores, leaderboards); later retired in v10.
- **v3** — Bulk processing: upload the monthly Excel and calculate the whole team at once.
- **v2** — Customizable achievement tiers, the Tier Ladder, PDF/CSV export, and dark/light themes.
- **v1** — The original single standalone HTML page: one person's payout from team achievement %, the tier system, and the P1/P2 split.

Built with Next.js 14, React 18, TypeScript 5, and Claude (development only — no user data is ever sent to it).

---

© 2026 HT · Keep Alive Project. Private, proprietary repository — not licensed for copying, scraping, or redistribution. Provided "as is"; not for production payroll or financial decisions.
