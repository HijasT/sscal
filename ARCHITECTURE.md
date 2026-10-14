# Architecture

A complete blueprint for rebuilding **Kleon** from scratch. It covers the philosophy that governs every decision, the technology, the full file map, each subsystem's data model and contracts, and the invariants that must never be broken. Read this with its siblings: **PRODUCT.md** (what/why/users), **DESIGN.md** (the visual system), **SECURITY.md** (security & privacy policy), **COMPONENTS.md** (the package "Journey" spec), and **CLAUDE.md** (working rules for contributors).

---

## 1. Philosophy (the non-negotiables)

Everything below is downstream of these. If a change violates one, the change is wrong, not the principle.

1. **Local-first, no backend, ever.** No server of our own, no database, no API, no accounts, no login. All computation happens in the browser; all persistence is the browser's own storage. This is a product constraint, not an implementation detail — it is the reason the product is trusted with staff pay and customer selections.
2. **Nothing leaves the device.** No fetch to external services for app data, no analytics, no telemetry, no error reporting, no third-party scripts, no CDN, no web fonts from a third party. The header's "100% local · no data shared" line is a promise the code is held to, and it is backstopped by a Content-Security-Policy with `connect-src 'self'` (see SECURITY.md).
3. **Ephemeral by default.** Data the user enters or uploads is deleted automatically one hour after it last changed, unless they explicitly opt to keep it. Only preferences persist indefinitely.
4. **Customer-safe Sale Assistant.** The Sale Assistant may be on screen in front of a customer at any moment. It must never show internal incentive figures, staff data, or developer chrome. (The floating robot is never rendered on that tab.)
5. **Minimal engineering ("the laziest thing that works").** No speculative abstractions, no dependency added for what a few lines can do, the shortest diff that follows existing patterns. Heavy libraries that are genuinely needed (`xlsx`, `jspdf`) are bundled and loaded via dynamic `import()`, never as a global/CDN script.
6. **Design that isn't "AI slop."** One calm lavender surface, no cards, hairlines for structure, one accent (Klea Violet) reserved for state, figures in monospace, flat by default. The owner has explicitly rejected the generic gradient/emoji/pill look. The full system is DESIGN.md; it is the source of truth for anything visual.
7. **Config is the single source of truth.** Version, defaults, retention window, tiers, staff-center map live in one file (`lib/config.ts`). Change a value there, not in the components that consume it.
8. **Correctness is visible and honest.** The incentive math is pure and validated; data the parser can't trust surfaces in a modal, not a silently wrong card. Figures are estimates, never payroll-authoritative (there is an in-app disclaimer).

---

## 2. Technology

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 14, App Router** | Static export of a single client page; `tsc` runs as part of `next build` (the only automated type gate). |
| Language | **TypeScript 5** (`strict: false`) | Types for structure; strict is off historically. |
| UI | **React 18** | One client component tree. |
| Styling | **Plain CSS** in `app/globals.css` with CSS custom properties (design tokens) | No Tailwind, no CSS-in-JS. One stylesheet, themed by a `body.light-mode` class and `:root` (dark) token sets. |
| Excel | **`xlsx`** (SheetJS), dynamic `import()` | Parse `.xlsx` in the browser. |
| PDF | **`jspdf` + `jspdf-autotable`**, dynamic `import()` | Generate the bulk report in the browser. |
| Fonts | **IBM Plex Sans** + **JetBrains Mono**, self-hosted in `public/fonts`, `@font-face` | No Google Fonts request (privacy). |
| Hosting | **Vercel** (static) with security headers from `next.config.js` | The headers are the backstop for the no-exfiltration promise. |
| State | React `useState`/`useEffect` + browser storage | No Redux/Zustand; the app is small. |

**There is no lint config and no CI.** The only automated check is `npm run build` (surfaces type errors) and `npm test` (calculation + catalogue tests). Verify UI changes by running `npm run dev` and exercising them.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build + type-check
npm run start   # run the production build
npm test        # calculation + catalogue tests
```

Path alias: `@/*` → repo root (`tsconfig.json`).

---

## 3. File map

```
app/
  layout.tsx        Root layout; injects the no-flash theme <script> (reads sic_theme before paint)
  page.tsx          The ONLY route. Client component: owns theme + robot state, renders the active tab,
                    the full-bleed top bar, the aura blobs, DataExpiryTimer, MessageModal.
  globals.css       The entire stylesheet: design tokens (light/dark), layout, every component, the .sa
                    scoped block for the Sale Assistant, the aura + frosted top bar.

components/
  tabs/
    BulkTab.tsx           Excel upload + BulkResultsView host (default tab's calculator side)
    BulkResultsView.tsx   The computed incentive table for everyone in the sheet; view modes
                          (monthly, q1–q4, h1/h2, yearly, alltime) filter/aggregate the same parsed data
    IndividualTab.tsx     Single-person incentive calculator (manual form, live result)
    SaleAssistantTab.tsx  The catalogue browser, Package Ladder, Compare, Package picker (largest file)
    SettingsTab.tsx       CRUD for tiers, staff-center allocation, toggles (robot, keep-data, USD, hide-covered)
    AboutTab.tsx          Static info + version history; reads APP_VERSION
  CenterBadge.tsx    Small center label chip (Bulk center-wise stats)
  DataExpiryTimer.tsx mm:ss countdown to data deletion; reloads the page at zero
  ErrorBoundary.tsx  Recoverable boundary (wraps the Bulk tab)
  MessageModal.tsx   The app's modal/dialog (errors, confirmations) — see lib/notify.ts
  Robot.tsx          "Kleon", the floating robot easter egg (never on the Sale Assistant tab)
  icons.tsx          All inline SVG icons (one family; no icon library, no emoji)

lib/
  config.ts          SINGLE SOURCE OF TRUTH: APP_VERSION, DEFAULT_TIERS, DEFAULT_P1_SPLIT,
                     DEFAULT_STAFF_COUNT, DEFAULT_THEME, DEFAULT_ROBOT_ENABLED, DATA_RETENTION_MS,
                     DEFAULT_USD_RATE, CENTERS, STAFF_CENTERS
  utils.ts           Core incentive math: calculateIncentive(), getTier(), tier/staff-center persistence
  excelUtils.ts      parseExcelFile(): the company-sheet-specific .xlsx parser (heuristics)
  catalogueUtils.ts  The Sale Assistant engine: composition graph, suggestions, package picker,
                     hide-covered, DNA labels, quote math, journey, gender, formatting
  catalogue.json     Static catalogue snapshot (services, panels, tests) — re-synced by hand
  pitchNotes.ts      Staff-facing per-package sales notes (kept out of catalogue.json so re-sync-safe)
  storage.ts         getFresh/setFresh with 1-hour expiry, EXPIRING_KEYS, preference helpers
  pdfUtils.ts        Bulk report PDF via dynamic import of jspdf
  notify.ts          Imperative API that drives MessageModal (notify.error/confirm/…)

scripts/
  fetch-catalogue.mjs  Regenerates lib/catalogue.json from the upstream catalogue page (manual, Node 18+)

Root docs: README, PRODUCT, DESIGN, SECURITY, COMPONENTS, CHANGELOG, CLAUDE, ARCHITECTURE (this file).
Reference-only: index.html (pre-Next legacy standalone), archive/ (old changelogs), mockups/ (static design mockups).
```

---

## 4. App shell (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`)

- **One route.** `app/page.tsx` is a client component; there are no other pages. It holds `activeTab` state and renders one of five tabs.
- **No-flash theme.** `layout.tsx` injects an inline script that reads `localStorage['sic_theme']` (default from `DEFAULT_THEME`) and adds `body.light-mode` before paint, so there is no theme flash. React then owns the toggle (`document.body.classList.toggle('light-mode', …)`).
- **Layout.** A single centred `.container` (max 1200px, 20px side / 40px top-bottom padding). The **top bar is full-bleed** (a sibling above `.container`, spanning the viewport, frosted) with its content centred to the same 1200px column. Three fixed **aura blobs** sit behind everything (z-index 0); content is z-index 1; the top bar z-index 20.
- **Tabs:** Sale Assistant (default), Calculator (hosts Bulk + Individual), Settings, About. `DataExpiryTimer` and `MessageModal` are always mounted.
- **Theming** is entirely CSS custom properties. `:root` holds the dark theme; `body.light-mode` overrides to the light (lavender) theme. No component hard-codes a one-theme hex. See DESIGN.md for the token values and rules.

---

## 5. Incentive math (`lib/utils.ts`) — the domain core

Pure, deterministic, and the thing every calculator tab builds on.

**Tier model** (`Tier` in `config.ts`): `{ id, name, min, max, rate, color }`. Lookup (`getTier`) is **lower-bound inclusive, upper-bound exclusive**. `DEFAULT_TIERS` map team achievement % to a rate; users can override them in Settings (persisted to `localStorage['sic_tiers']`, with a one-slot undo backup).

**`calculateIncentive(teamTarget, teamSales, mySales, staffCount, p1Percent, customTiers?) → CalculationResult`:**

1. Validate (NaN guards; target & staffCount > 0; sales ≥ 0; `mySales ≤ teamSales`; `teamSales > 0`). On failure, returns `{ error }`.
2. `teamAchievement = teamSales / teamTarget × 100`.
3. `tier = getTier(teamAchievement)` → its `rate`.
4. `totalPool = rate% × teamSales`, split by `p1Percent` into:
   - **P1 pool** — divided **equally** among `staffCount` (each person's equal share).
   - **P2 pool** — divided by each person's **share of teamSales** (`mySales / teamSales`), i.e. performance-weighted.
5. `myTotal = myP1 + myP2`.
6. **Next-tier projection** (`nextTierInfo`): how much more team sales are needed to reach the next tier; at the top tier, how much extra was earned versus the tier threshold; below the lowest tier (rate 0), the deficit to reach the first tier.

`CalculationResult` carries every intermediate (`teamAchievement`, `tier`, `totalPool`, `p1Pool`, `p2Pool`, `myP1`, `myP2`, `myTotal`, `myContribution`, echoes of inputs, `nextTierInfo`, optional `error`).

**Bulk** applies this same per-person logic across everyone in an uploaded sheet (`BulkResultsView`), rather than one manual entry, and aggregates across periods (month/quarter/half/year/all-time) by filtering the same parsed `ExcelData[]` — never re-parsing.

---

## 6. Excel ingestion (`lib/excelUtils.ts`)

`parseExcelFile()` parses one **specific company spreadsheet layout**, not a generic table. It locates data by scanning for literal cell content and fixed structural conventions — if parsing breaks, the fix is almost always in these heuristics, checked against a real sample sheet:

- **Data sheets** are tabs whose name contains a recognised month name + 2-digit year (e.g. `"May 26"`; full names like `"September"` are normalised to short form first).
- **Team target** is found by scanning rows for a `TARGET` label cell.
- **Month-total column** is located by matching the sheet's month/year against header row 3 (0-indexed row 2) containing "ttl"/"total".
- **Staff rows** start at row 4; each staff block is identified by a `"Count of Packages"` type-cell, with an optional `"Count of Clients"` row (newer May 2026+ format) shifting the sales-row offset by one.
- **Working days** are inferred by counting non-blank, non-`"NA"` daily sales cells across detected day-of-month columns (handles plain integers, Excel date serials, and string day values).
- **SOP cases:** `NA`/`N·A` = absent, blank = 0 sales, `#REF!` = flagged. Anything untrusted surfaces in a modal, not a card.

Employee codes (`AE##-###`) are extracted from the name cell to map staff → center (`STAFF_CENTERS` in config; keyed by code so the public repo holds no real names).

---

## 7. Sale Assistant subsystem (`SaleAssistantTab.tsx`, `lib/catalogueUtils.ts`, `lib/catalogue.json`)

The largest subsystem. The tab is a catalogue browser plus the signature **Package Ladder**; all intelligence lives in `catalogueUtils.ts` over the static `catalogue.json`.

### 7.1 Catalogue data model (`lib/catalogue.json`)
Three top-level keys:
- **`services[]`** — each package: `{ id, sku?, category, sub, name, price, currency, biomarkers, doctor, panels[], comps[], components[] }`.
  - `panels[]` → keys into `panels`. `comps[]` → grouped rows (`{ group, name, value }`) for "what's included" (groups: `Doctor & Vital Signs`, `BCA / ECG`, `Microbiome`, `DNA Modules`). `components[]` → the client **Journey** steps in order (see COMPONENTS.md). `sku` is internal, never shown in the UI.
- **`panels{}`** — `panelName → { tests: number[], count }`.
- **`tests{}`** — `testId → { name, group, method, req }`. `group` is the clinical profile (Liver Profile, Complete Blood Count, …) and powers the marker picker.

Catalogue is a hand-maintained snapshot (51 services + the synthetic HEALTHMAXXING). Brand names are stripped on every re-sync. Re-synced by `scripts/fetch-catalogue.mjs`; internal SKUs and `pitchNotes` are merged/kept outside the upstream data so they survive re-syncs.

### 7.2 Composition graph & suggestions (`catalogueUtils.ts`)
- **`COMPOSITION`** — a hand-written map: each package → the packages it directly contains (e.g. Household ⊂ Standard ⊂ Premium ⊂ Premium PLUS). `includesClosure(name)` resolves the transitive set.
- **`suggestPackage(selected, gender?)`** — the cheapest single package whose closure covers every selected package (the Package Ladder's core upsell). `suggestPartialPackage` covers most-but-not-all. `getSuggestionExtras` / `excludedMarkers` / `excludedDnaModules` explain the delta ("What it adds" / what it leaves out).
- **HEALTHMAXXING** — two gender-specific synthetic catch-all packages, injected at runtime from the union of their component packages' panels/comps. `isHealthmaxxing`, `expandForQuote` (picking it drops its real component packages into the quote), suggested only once the selection totals AED 10,000+.

### 7.3 Package picker (markers → package)
- **`markerCatalogue(gender?)`** — every lab marker grouped by clinical profile (`test.group`), excluding allergy/intolerance panels (too many allergens) and markers no sellable package for that gender covers.
- **`findPackageForMarkers(ids, gender?)`** — cheapest package whose markers cover all selected ids; if none fully covers, the closest + the missing marker names.

### 7.4 Hide already-covered packages
- **`isCoveredBySelection(candidate, selected)`** — true when a selected package fully contains the candidate's **entire** content: every marker AND every BCA/ECG/DNA-module/gut comp (the Doctor & Vital Signs group is excluded). Missing even one item → not covered. Driven in the catalogue filter, gated by the Settings toggle (`sic_hide_covered`, default on), skipped while searching.

### 7.5 "Included packages" summary (bundle detail)
- **`dnaPackageLabels(service)`** — DNA modules shown as standalone DNA **package names** when they decompose exactly into whole DNA packages (Essentials → "DNA - Essentials"; All of You / Dubai It → "DNA - All of You"; HEALTHMAXXING → All of You + Hair Loss + Acne), else a plain "DNA (N modules)".
- **`dnaPackagePanelNames()`** — panels belonging to a standalone DNA package, dropped from the panel list so DNA isn't shown as both a panel and a package.

### 7.6 Other
- **Quote math** (`quoteTotals`, `lineGross/Net`, `lineDiscountAmount`, `maxDiscountPct`) — per-line discounts with caps. **Journey** (`buildJourney`, `packageComponents`) — the client-facing step sequence (COMPONENTS.md). **Pitch notes** (`pitchNotes.ts`) — the per-package "i" sales notes, customer-benefit worded. **Gender** (`serviceGender`). **Formatting** (`formatAED`, `formatUSD`). The selection + gender persist in `sessionStorage['sic_sale_quote']`.
- **Styling** lives in a scoped `.sa` block at the end of `globals.css` (prefix `sa-`, own per-theme `--sa-*` tokens), following `mockups/sale-assistant.html` and now the single-surface Material You direction.

---

## 8. Storage & retention (`lib/storage.ts`, `components/DataExpiryTimer.tsx`)

- **Fresh wrappers.** User data is written with `setFresh(kind, key, value)` and read with `getFresh`, which keep a sibling `<key>__saved_at` timestamp. Anything older than `DATA_RETENTION_MS` (1 hour, `config.ts`) or without a timestamp is deleted on read/purge. The clock restarts only when the stored value changes; empty state is never stored.
- **`EXPIRING_KEYS`** — the only keys that auto-expire: `sic_bulk_upload`, `sic_bulk_results` (local), `sic_individual_inputs`, `sic_sale_quote` (session). **Any new key holding user data must be added here.**
- **`DataExpiryTimer`** shows the mm:ss countdown and reloads the page at zero.
- **Persist escape hatch.** `sic_persist_data = 'true'` (the "Keep data on this device" setting) turns expiry off; data then stays until cleared.
- **Preferences never expire:** `sic_theme`, `sic_robot_enabled` (legacy `sic_kitty_enabled` read as fallback), `sic_tiers` (+ `_saved_at`, `_backup`), `sic_staff_centers` (+ `_saved_at`, `_backup`), `sic_show_usd`, `sic_usd_rate`, `sic_hide_covered`.

---

## 9. Export, config, support systems

- **PDF** (`lib/pdfUtils.ts`): one report — the bulk results table with the P1/P2 split and pool amounts — generated via dynamic `import()` of `jspdf`/`jspdf-autotable` (no CDN).
- **Config** (`lib/config.ts`): the single source of truth. Update values here; they flow into the header, About tab, and consumers automatically.
- **Notifications** (`lib/notify.ts` + `MessageModal`): an imperative API (`notify.error`, `notify.confirm`, …) so untrusted/parse-failure cases surface in a modal rather than a silently wrong card.
- **ErrorBoundary**: wraps the Bulk tab for recoverable failures.

---

## 10. Security & privacy (summary; full policy in SECURITY.md)

- **No server, no secrets.** No `.env`, no credentials, no API keys of our own.
- **Security headers** (`next.config.js`, every route): a strict CSP with **`connect-src 'self'`** (the exfiltration guarantee), `object-src 'none'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, HSTS (2y, preload), `Permissions-Policy` denying camera/mic/geolocation. `X-Powered-By` removed.
- **No network for app data.** Fonts self-hosted; heavy libs bundled; no analytics/telemetry/third-party scripts.
- Excel/PDF are processed entirely in the browser.

---

## 11. Build, release, maintenance

- **Build gate:** `npm run build` (runs `tsc`). `npm test` for calculation/catalogue. No lint, no CI.
- **Versioning (SemVer):** single source `APP_VERSION` in `config.ts`. PATCH = fix/cosmetic; MINOR = feature/large redesign-by-impact; MAJOR = breaking/feature-removal. Every MAJOR also gets an About → Version History entry.
- **Changelog:** a single root `CHANGELOG.md`, newest first, `Added`/`Fixed`/`Changed`/`Removed` sections per version. Prepend; never rewrite history. No git tags/releases.
- **Catalogue re-sync:** `node scripts/fetch-catalogue.mjs` regenerates `lib/catalogue.json` from the upstream page. It merges internal SKUs and keeps `pitchNotes` separate so they survive. Strip brand names after any re-sync.
- **Deploy:** Vercel static. The security headers must ship with it.

---

## 12. Invariants (break these and it isn't Kleon)

1. No backend, no database, no account system, no server-side data.
2. No network request for app data; no analytics/telemetry/third-party scripts/CDN; fonts stay self-hosted. The CSP `connect-src 'self'` must remain.
3. Entered/uploaded data auto-expires in 1 hour unless the user opts to keep it; new user-data keys go in `EXPIRING_KEYS`.
4. The Sale Assistant stays safe to show a customer (no internal figures/chrome; no robot on that tab).
5. The incentive math stays pure, validated, and the single implementation every tab reuses.
6. Config values live only in `lib/config.ts`.
7. The visual system follows DESIGN.md: one lavender surface, no cards, hairlines, one violet for state, figures in monospace, no "AI slop". Colours are light/dark token pairs.
8. New dependencies are rare, justified, bundled (never CDN/global script), and approved first.

---

## 13. Rebuild checklist (from zero)

1. **Scaffold** Next.js 14 (App Router) + TypeScript + React 18. Add `next.config.js` with the security headers and `poweredByHeader: false`. Alias `@/* → .` in `tsconfig.json`.
2. **Self-host fonts** (IBM Plex Sans, JetBrains Mono) in `public/fonts`; declare `@font-face` in `globals.css`. No Google Fonts.
3. **Tokens & shell:** build `globals.css` tokens (light `body.light-mode`, dark `:root`) per DESIGN.md; `layout.tsx` no-flash theme script; `page.tsx` single-route tab shell with the full-bleed frosted top bar + aura blobs.
4. **Config** (`lib/config.ts`): version, tiers, splits, retention, centers.
5. **Domain math** (`lib/utils.ts`): `calculateIncentive`, `getTier`, tier persistence + undo. Add the calculation test.
6. **Storage** (`lib/storage.ts`): `getFresh`/`setFresh` with expiry, `EXPIRING_KEYS`, preference helpers; `DataExpiryTimer`.
7. **Calculators:** Individual (manual) then Bulk + `BulkResultsView`; then `excelUtils.ts` parser against a real sample sheet (SOP cases, period aggregation). `pdfUtils.ts` for export.
8. **Sale Assistant:** `catalogue.json` (services/panels/tests) + `fetch-catalogue.mjs`; then `catalogueUtils.ts` (composition, suggestions, picker, hide-covered, DNA labels, journey, quote math); then `SaleAssistantTab.tsx` and the `.sa` styles. Add the catalogue test.
9. **Settings, About, icons, notify/modal, ErrorBoundary, Robot.**
10. **Verify:** `npm run build` (types) + `npm test`; exercise each tab in `npm run dev`; confirm the CSP blocks any outbound connection and that data clears after an hour.
