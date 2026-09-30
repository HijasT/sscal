# Changelog

All notable changes to this project are documented in this file.

## [9.5.1]

### Changed
- **"Suggested package adds" is now package-aware and clickable.** When the extra markers make up a complete individual package (none of it already selected), the package name is shown greyed (e.g. "Cancer Risk - BRCA Genetic Test"); the rest is summarised per profile ("+3 Cancer Risk Profile"). A complete DNA package shows by name, otherwise "+N DNA modules". Clicking any chip opens a bubble listing the actual extra markers.

### Added
- **"Non-invasive" filter** — shows only packages that don't prick the patient: no blood markers, no DNA modules (DNA tests are blood-drawn) and no vaccinations (a needle). Leaves body composition, ECG, gut microbiome and plain consults.
- **Clear (✕) button** in the package search field.

### Changed
- "Blood tests only" and "Non-invasive" are now **mutually exclusive** (checking one unchecks the other). Neither is persisted — both clear on refresh.

### Changed
- **Selected Packages now shows what the suggestion adds by marker group, not by package.** Instead of greying out component packages (which could list e.g. Liver/Thyroid profiles whose markers are already inside a selected Premium screening), it shows only the extra markers the suggested package brings, summarised per profile (e.g. "+5 Lipid Profile", "+2 Thyroid Profile"), plus extra DNA modules and add-ons (BCA/ECG/gut microbiome).

### Fixed
- **Base screenings now ladder up for suggestions.** The composition graph nests HDS ⊂ Standard ⊂ Premium ⊂ Premium PLUS, so e.g. Standard + Cortisol now suggests Premium PLUS (previously only Premium + Cortisol did).

### Changed
- **"Blood tests only" now shows pure blood-test packages.** It hides any package that includes non-blood add-ons — DNA modules, gut microbiome kit, BCA or ECG — so comprehensives no longer appear (a doctor consultation is still allowed).

### Added
- **Discount on the suggested package.** The Suggestions area now has its own discount input (percentage or fixed AED); the discounted suggestion price flows into the comparison bar and the Package Ladder summary.

## [9.4.2]

### Added
- **DNA-module exclusion notice on suggestions.** When a suggested package carries fewer DNA modules than a selected package includes, the missing modules are flagged ("DNA modules not in this package") — e.g. suggesting Ultimate/Executive (11 modules) for a selection with DNA - All of You (12) now shows that Biocertica DNA - Ancestry is not included.

## [9.4.1]

### Fixed
- The greyed "still needed" packages under Selected Packages no longer list items already covered by a selected package. It now subtracts everything the current selection transitively includes, so e.g. with Premium PLUS Women's + BCA selected and Essentials Women's suggested, only DNA - Essentials is shown as missing (not Premium, Cortisol, Liver or the Thyroid profile, which Premium PLUS already includes).

### Added
- **Men/Women toggle** (default Men) at the top of the Sale Assistant — the catalogue and suggestions show only that gender's packages plus common (non-gendered) ones.
- **Category headings** in the catalogue list: results are grouped under the five source categories (Core Health Screening, Specialised Screening, DNA Insights, Other Screenings & Consults, Comprehensive Packages / Bundles).
- **"Selected Packages" → "Suggestions" ladder.** Suggestions shows the single cheapest package that includes everything selected, gendered to match the toggle (e.g. Blood Group + BRCA → Executive Men's, or Executive Women's on the Women toggle). The packages that suggestion would still add are listed **greyed with an Add button** under Selected Packages, and a **"Move to Selected (replace)"** button swaps the whole selection for that one package.

### Changed
- Renamed the quote section to **Package Ladder**, "Quote A" to **Selected Packages**, and "Quote B" to **Suggestions**.
- Suggestions now surface a single package (the cheapest that fully includes the selection) rather than an auto-composed multi-bundle mirror. **HEALTHMAXXING** is only suggested once the selected total reaches AED 10,000.

### Changed
- **Bundle suggestions now use an explicit package-composition graph.** Quote B suggests the cheapest package that *includes* the selected individual packages (based on how packages are actually built from one another), rather than the largest one that merely contains their markers. Examples: Premium + Cancer Risk – Men + Cortisol → **Premium PLUS Men's** (AED 1,695, cheaper than buying them separately); Blood Group + BRCA → **Executive** (not Dubai It); Premium PLUS Men's + Longevity + food tests → **Ultimate Men's Longevity + Food Allergy & Intolerance Bundle**. Coverage is transitive (e.g. Dubai It includes Executive, which includes All of You, which includes Premium PLUS…).

### Added
- **HEALTHMAXXING package** (AED 19,150) — an unofficial package that covers everything on offer (Dubai It + DNA Hair Loss + DNA Acne + Gut Microbiome + Respiratory Allergy). It is added to the catalogue (synthesised from its components' panels and inclusions) and participates in search, the quote, and suggestions like any other package.

### Changed
- The catalogue package button now **toggles** the package in and out of Quote A (Add ↔ Remove) instead of incrementing a quantity — packages are one-per-quote. Removed the per-line quantity stepper from Quote A accordingly (people don't buy the same package twice).

## [9.2.1]

### Fixed
- **Package search is now word-based.** A query matches when every typed word appears in the package name, category, or a marker name, regardless of order — so "dubai men" finds the Dubai It Men's Package and marker searches like "vitamin d" work. Previously the whole query had to be one contiguous substring.

### Changed
- **Package drill-down now mirrors the source catalogue's structure.** A package's details are shown as "What's included" groups (Consultation, BCA/ECG, DNA Modules, Microbiome, Vaccinations) followed by **Blood panels** — each panel listed with its marker count and markers — instead of the previous derived "component packages" / profile-grouped view. This applies to every package; a comprehensive simply lists its several panels (e.g. Dubai It → Premium PLUS Men's 80, Cancer Risk – Men 6, Longevity 22, Blood Group 2, BRCA 2, Food Allergy & Intolerance 292).

### Added
- **Excluded-markers check on Quote B.** When Quote B suggests a bundled version of Quote A, any markers present in Quote A's packages but not in the bundled composition are flagged ("Not in the bundle"). With the current catalogue (nested base panels; bundles are supersets of what they replace) this will normally be empty, but it surfaces automatically if a suggested bundle ever leaves a marker out.

### Fixed
- **Quote B no longer over-bundles into the most expensive package.** A bundle is now used only when the selection contains all of that bundle's own component packages (or, for a bundle with no panel-derived components like the Food Allergy & Intolerance Bundle, packages whose tests exactly make it up) — so, for example, Blood Group + BRCA Genetic Test now stay as individual lines instead of collapsing into the Dubai It package. Also fixed a circular component match where the Food Allergy & Intolerance Bundle and Ultimate Gut package each treated the other as their component (a bundle's component package is now the cheapest non-comprehensive package for that panel).

### Added
- **DNA package as a bundle component.** Where a bundle's DNA-module set exactly matches a standalone DNA package (e.g. "All of You Men's" / Dubai It → DNA - All of You, "Essentials Men's" → DNA - Essentials), that DNA package is now shown as a component in the drill-down, with its modules listed. Bundles carrying a custom DNA-module set that matches no package keep those modules under the "DNA Modules" inclusions section.

### Changed
- A bundle's drill-down now shows its tests **grouped under each component package** rather than as one flat list: it lists the composition (e.g. Executive Men's = Premium PLUS Men's + Cancer Risk – Men + Blood Group Test + BRCA Genetic Test), then each component package with its own resolved tests beneath it. Plain (non-bundle) packages still show their lab tests grouped by profile.

## [9.1.0]

### Changed
- **Quote B is now an automatic, live bundled mirror of Quote A.** Instead of manually applying individual bundle suggestions, Quote B always shows the fully-bundled version of Quote A — composing every applicable comprehensive/bundle package (e.g. Ultimate Men's + Food Allergy & Intolerance Bundle) plus any packages no bundle covers — and it updates as Quote A changes. Two greedy strategies (fewest bundles vs cheapest-first) are tried and the lower-priced composition is shown, avoiding both over-reach (one huge comprehensive) and redundant overlapping bundles.
- Quote B's lines are **editable for discounts** (percentage or fixed AED, per line), so the bundled price can be negotiated and compared against Quote A; the per-line discounts persist as Quote B recomposes. Quote B is otherwise read-only (its packages are derived from Quote A). The manual "+B" add button and per-bundle "Apply" suggestions are removed in favour of this automatic mirror.

## [9.0.0]

### Added
- **Quote B now suggests bundles based on Quote A.** As packages are added to Quote A, Quote B shows the cheapest "bundle a subset + keep the rest" combinations that cover Quote A's selection; one click fills Quote B with that bundled combination, so Quote A (à la carte) can be compared directly against the bundled version in Quote B.

### Removed
- **Customer name field** removed from both quotes — the quote tool is a pricing/comparison scratchpad, not a customer record.

## [8.18.0]

### Added
- **Side-by-side quote comparison.** The Sale Assistant tab now holds two quotes (A and B). Each catalogue row has "+A" / "+B" buttons, and a comparison bar shows both totals and which quote is lower. Each quote has an optional customer name.
- **Per-line discounts.** Every line in a quote carries its own discount, entered as a percentage or a fixed AED amount, with the line total updating live.
- **Search by marker.** Package search now also matches lab-test/marker names, so a package can be found by what it tests for (e.g. "vitamin d").
- **"Blood tests only" filter** — hides packages with no lab tests (consult-, vitals-, DNA- or vaccination-only) from the catalogue list.
- **Bundled-packages breakdown.** A bundle/comprehensive package's drill-down now lists the individual packages it is built from (e.g. Dubai It Men's shows Premium PLUS Men's, Cancer Risk – Men, Longevity, Blood Group, BRCA, and the Food Allergy & Intolerance Bundle) above the service inclusions and the full lab-test list, so it's clear which packages a bundle combines rather than only the raw tests.

### Changed
- **Bundle suggestions now support partial bundling.** Previously a bundle was only suggested when one comprehensive package covered the entire selection; now it finds the cheapest "bundle a subset + keep the rest" combination, so a bundle is still surfaced when it covers only part of the selection (uncovered packages stay as individual lines). Candidates are limited to comprehensive/bundle packages, and one click applies the suggestion (replaces the covered lines with the bundle).

### Removed
- **Quote PDF export.** The Sale Assistant quote no longer exports to PDF; the quote tool is now focused on on-screen comparison. (`exportQuoteToPDF` removed from `lib/pdfUtils.ts`.)

## [8.17.1]

### Changed
- The Sale Assistant bundle suggestion now shows only the single least-priced comprehensive package that covers the selection (previously up to three covering packages were listed). Covering packages are sorted by price, so the one shown is the cheapest package that includes the selected tests.

## [8.17.0]

### Added
- **Bundle opportunities in the Sale Assistant tab** — when two or more packages are in the quote, the tab surfaces comprehensive packages that fully cover the selection, showing the bundle price vs buying individually, the price difference (a saving or an upsell premium), and what extra the bundle adds (extra lab tests / add-ons like DNA modules, BCA/ECG, microbiome). One click adds the bundle to the quote. Coverage is content-based (matches on the actual lab tests + service components a package includes), so it correctly links e.g. the Food Allergy & Intolerance Bundle to its two component tests even though their panel names differ.

### Fixed
- **Package drill-down now shows every included lab test.** Previously the "what's included" view only listed the curated service-level summary (`comps` — doctor, vitals, DNA modules, etc.), so blood/biomarker tests were missing (e.g. Standard Health Screening showed only the doctor consultation and vitals, not its 50 lab markers). The drill-down now also resolves and lists the full lab-test breakdown grouped by profile (Complete Blood Count, Lipid Profile, etc.).

## [8.16.0]

### Added
- **Quote builder in the Sale Assistant tab** — add packages to a quote, adjust quantities, apply an optional percentage discount, and see a running AED subtotal/discount/total. The in-progress quote persists to `sessionStorage['sic_sale_quote']` so it survives tab switches within a session (and clears when the tab is closed), matching the Individual tab's behaviour.
- **Quote PDF export** (`exportQuoteToPDF` in `lib/pdfUtils.ts`) — exports the quote (optional customer name, line items, discount, total) to a PDF using the existing bundled jsPDF dynamic-import pattern, so it works with no network request.

## [8.15.0]

### Added
- **Sale Assistant tab** — a searchable, category-filtered browser for the full package catalogue (51 packages), showing AED prices and an expandable "what's included" breakdown per package. Runs entirely on a bundled static snapshot, so it makes no network calls (preserves the "100% local · no data shared" guarantee).
- `lib/catalogue.json` — bundled catalogue snapshot (51 services with prices + 33 panels + 471 tests), extracted from the upstream catalogue page.
- `lib/catalogueUtils.ts` — typed loader and pure helpers (search, category listing, AED formatting, panel/test drill-down, and quote-total math for the upcoming basket).
- `scripts/fetch-catalogue.mjs` — one-command re-sync that regenerates `lib/catalogue.json` from the upstream catalogue page (`node scripts/fetch-catalogue.mjs`); plain Node 18+, no dependencies.

## [8.14.2]

### Changed
- Added more variety to Sales Kitty's poke-reaction lines (6 new, on top of the existing 6), including the "You think this is funny? No incentive for you next month." line.

## [8.14.1]

### Fixed
- Sales Kitty jumped far more often than it walked — the jump-vs-walk threshold (20px) and box-target selection had no bias toward same-height targets, so most moves between the page's naturally varied-height boxes counted as jumps. Box selection now strongly prefers a target at roughly the same height as the current one (a walk) and prefers patrolling the current box over switching, with the height threshold raised to 50px. Verified via direct algorithmic sampling against live pages: walk-to-jump ratio improved from roughly even to ~75%/25% in favor of walking.
- The comment bubble could render partially or fully off-screen (clipped by `body`'s `overflow-x: hidden`) when the cat was near the left or right edge of the viewport, since it was always centered on the cat regardless of available space. It now anchors to whichever side keeps it fully on-screen when the cat is close to an edge.

### Changed
- Added more sarcastic lines to both the before-100% and after-100% comment pools.
- Sleeping is now a fixed 10 seconds (previously a 7-13s random range).

## [8.14.0]

### Changed
- Sales Kitty no longer roams to arbitrary points on the page — it now walks along the top edge of real rectangular UI elements (`.card`, result/stat cards, the slider section, inputs, selects, buttons, etc.), landing exactly on a box's top edge and walking horizontally across it. Moving to a box at roughly the same height reads as a normal walk; moving to one at a meaningfully different height triggers the jump/hop animation for the whole trip (looped bounce instead of one bounce then a flat glide) instead of a smooth diagonal glide. Falls back to the old free-roam behavior if no boxes are found on the page.
- Added a "sleeping" idle pose alongside sit/purr/lick/jump: body squishes down, legs tuck away, eyes close, tail stops wagging, and a small floating "Z" appears — held for a longer 7-13s nap instead of the usual 3-6s idle window.
- The personalized "{name}, is that you?" line is now capped to at most once every 2 minutes, regardless of how many auto-comments fire in between (previously it could roll on every ~20s comment).

Verified the box-landing math, jump-vs-walk classification, and sleep-pose timing via console tracing during development — this session's browser automation tab was subject to Chrome's background-tab timer throttling (multi-minute gaps between expected and actual timer fires when left unattended), which is a testing-environment artifact and doesn't affect a normal, focused user tab.

## [8.13.0]

### Changed
- Rebranded the accent color from slate-blue to the new brand purple (klea health), across both themes: `--accent-primary`/`--accent-secondary`/`--accent-tertiary`/`--accent-soft` in `app/globals.css`. Semantic colors (`--success`, `--warning`, `--error`) and the per-tier colors are untouched — those are status/identity colors, not brand.
- Added `--brand-gradient` (derived from the accent scale, so it stays theme-consistent) and applied it where a flat accent color reads as noise on a larger surface: `.btn-primary` backgrounds, the header `<h1>` title (gradient text via `background-clip: text`, with a solid-color fallback for browsers without support), and the active nav tab's underline (now a small gradient bar via `::after` instead of a flat `border-bottom-color`, since a gradient border-color isn't a thing). Thin elements (borders, small text, range slider thumb) keep the flat `--accent-primary` — a gradient doesn't read as anything but noise at 1-2px.
- Recolored Sales Kitty from orange to the brand purple (body/ears/legs/stripes/whiskers); nose and tongue stay pink/red as natural facial features.
- Updated `public/favicon.svg` and `public/manifest.json`'s `theme_color` from the old teal to the new purple.

## [8.12.0]

### Changed
- Sales Kitty's idle commentary now depends on team performance instead of one flat pool: separate `BEFORE_100_COMMENTS` and `AFTER_100_COMMENTS` sets, chosen by reading the most recently saved monthly team achievement from Bulk & Analytics' history (`localStorage['smart_incentive_analytics']`, read-only). Defaults to the before-100% pool if nothing's been calculated yet this session. Poke-reaction lines updated (one reworded, one added: "You think this is funny?").
- Comment display time increased from 4 to 5 seconds (`BUBBLE_MS`).

### Fixed
- The comment bubble rendered one word per line in a tall, narrow column instead of wrapping normally — the absolutely-positioned bubble had no explicit width, so its shrink-to-fit sizing was computed against a tiny available-width budget (its containing block is only as wide as the cat itself, and the bubble's `left: 50%` offset ate most of that). Fixed with `width: max-content` so it sizes to its text first, then wraps normally against `max-width`.

## [8.11.1]

### Fixed
- The cat visibly jumped downward the instant a comment bubble appeared (and jumped back when it closed) — `.sales-kitty-wrap` laid the bubble and cat out with `flex-direction: column`, so the bubble (first in DOM order) pushed the cat down to make room for itself instead of appearing as an overlay. The bubble is now absolutely positioned above the cat (`bottom: 100%`, centered), so it never affects the cat's own position — verified the button's bounding rect is pixel-identical whether or not the bubble is showing. Comment duration is unchanged at 4 seconds (`BUBBLE_MS`).

## [8.11.0]

### Added
- Sales Kitty on/off toggle in Settings → Preferences, persisted to `localStorage['sic_kitty_enabled']`. Defaults to on (`DEFAULT_KITTY_ENABLED` in `lib/config.ts`). The toggle state lives in `app/page.tsx` (same pattern as the theme toggle) and is passed down to `SettingsTab`, which now takes `kittyEnabled`/`onToggleKitty` props.

## [8.10.1]

### Fixed
- Sales Kitty's walk looked like it was being dragged to its next spot rather than walking there — the wrapper used a fixed 2.5s `ease-in-out` transition regardless of distance, so short hops crawled and long hops sped by, with an eased deceleration that read as something being "placed" rather than a creature stepping. Movement is now a constant ~90px/sec at a `linear` pace, with transition duration derived from the actual distance per move, so pace matches the leg-step animation naturally.

## [8.10.0]

### Changed
- Replaced Sales Kitty's emoji sprite with a proper animated inline-SVG cat (orange, with stripes, ears, tail, and four legs) — walking now animates a real leg-swing gait and a continuously wagging tail instead of swapping static glyphs; jumping, sitting, purring (squinting eyes), and licking (tongue flick) are now genuine part-level animations on the same character rather than different emoji.
- Auto-comments now fire on a strict minimum 20-second cooldown (previously they could appear as often as every ~17s during a settle phase) — the cat visibly stops, sits, and does a little "looking at you" head-nod while it talks, then resumes wandering. Poking it also resets the cooldown so it doesn't immediately chime in again afterward.
- Added a personalized line — "{first name}, is that you?" — used for a fraction of auto-comments when a staff name is available. Read-only: reads whatever names are already sitting in the last Bulk & Analytics Excel upload (`localStorage['sic_bulk_upload']`), reusing the existing `stripEmployeeCode()` helper to get a clean first name. No new coupling to calculator state, no data leaves the browser.
- Still fully local: no image assets, no new dependencies, `prefers-reduced-motion` now also disables the SVG's own CSS `animation`s (tail wag, leg step, look-nod, lick, jump, flinch), not just `transition`s.

## [8.9.1]

### Fixed
- Bulk & Analytics tab could crash entirely with "Cannot read properties of undefined (reading 'min')" whenever the tier list was empty or a stale/mismatched tier reference existed — a regression from the 8.7.0 tier restructuring, where `calculateIncentive()`'s "below lowest tier" projection (`lib/utils.ts`) indexed `sortedTiers[0]` without a guard, unlike the equivalent code already fixed in `BulkResultsView.tsx`. Also hardened `loadTiers()` to fall back to `DEFAULT_TIERS` when the saved tier list is empty or malformed (previously only an empty/missing localStorage value triggered the fallback), and added a matching guard to `BulkResultsView.tsx`'s own tier-projection logic for the case where a cached calculation's tier no longer matches any currently configured tier.

## [8.9.0]

### Changed
- Upgraded Sales Kitty (`components/Kitty.tsx`) from a single static pose to a proper walk/settle behavior loop: it now strolls to a random point, then randomly sits, purrs, licks (grooms), or jumps for a few seconds before showing its sarcastic comment and moving on — cycling indefinitely. Poses are native cat-face emoji swaps (🐈/😻/😽/🙀), no image assets. Considered wiring in a third-party "walking cat" widget (techtools.cz) instead but kept this local: an external `<script src>` would add an unpinned, unaudited third-party dependency executing on every page load, contradicting the app's "100% local calculation · No data shared" guarantee. Same click-to-poke interaction as before (now shows 😾), same comment pools, still zero dependencies/localStorage/network calls.

## [8.8.0]

### Added
- Sales Kitty (`components/Kitty.tsx`): a small cat that wanders the app (fixed-position, random walk, ~7-14s between moves) and periodically pops up a sarcastic one-liner about sales performance. Clicking it shows a "stop poking me, go do some sales instead"-style comeback instead. Purely decorative — no localStorage, no network, no dependency on any calculator state. Respects `prefers-reduced-motion` by staying put (still clickable) instead of wandering.

## [8.7.1]

### Changed
- Moved the `Tier` interface and `DEFAULT_TIERS` from `lib/utils.ts` into `lib/config.ts`, alongside the app's other app-wide defaults (`DEFAULT_P1_SPLIT`, `DEFAULT_STAFF_COUNT`, `DEFAULT_THEME`) — `lib/utils.ts` now imports them from there. `SettingsTab.tsx` now imports `DEFAULT_TIERS`/`Tier` from `@/lib/config` instead of `@/lib/utils`. No behavior change.

### Fixed
- The About tab's "How It Works" tier list and calculation example still described the pre-8.7.0 tier ladder (Tier 1 at 75–85%, a "Tier 4" at 111%+) — missed when the tiers changed in 8.7.0. Updated to match the current 3-tier ladder (85–101% / 101–111% / 111%+).

## [8.7.0]

### Changed
- Removed the old Tier 1 bracket (75–85%, 1.5% rate) from the default incentive tiers (`DEFAULT_TIERS` in `lib/utils.ts`). Team achievement below 85% now earns no pool (0% rate) instead of the old 1.5%. The default ladder is now: Tier 1 = 85–101% @ 2.5%, Tier 2 = 101–111% @ 3.0%, Tier 3 = 111%+ @ 3.5%. This only changes the *default* tiers — anyone with tiers already saved via Settings (`localStorage['sic_tiers']`) keeps their existing configuration and must update or reset it manually.

### Fixed
- The "next tier" projection shown when team achievement is below the lowest tier (in `IndividualTab` and `BulkResultsView`) hardcoded a 75% threshold and "Tier 1" label, which happened to match the old default. It now reads the actual lowest configured tier's minimum/name/rate, so it stays correct regardless of tier configuration.

## [8.6.5]

### Fixed
- Excel sheet tabs with stray leading/trailing/doubled whitespace in their name (e.g. `"May 26 "`) were silently dropped from month/year filtering (`lib/excelUtils.ts`) — the sheet parsed correctly but its raw, unnormalised name was used for exact-match and end-anchored (`/\d{2}$/`) lookups in `BulkResultsView`, `AnalyticsDashboardView`, and the year-list builder in `BulkAnalyticsTab`, none of which matched. Sheet names are now trimmed and internal whitespace collapsed once, at parse time, while the original raw name (whatever it actually is) is still used to look up the worksheet itself.

## [8.6.4]

### Changed
- Hid the "Analytics Dashboard (beta)" sub-view toggle in Bulk & Analytics — the tab now always shows Bulk Results. `AnalyticsDashboardView` and its data/history logic are untouched and can be re-enabled by restoring the toggle in `BulkAnalyticsTab.tsx`.

## [8.6.3]

### Changed
- Removed the 200 ceiling from performance score components (Sales, Clients, Packages, Pace) added in 8.6.2 — scores are now floored at 0 with no upper limit at all, so overall performance (still 50% Sales + 20% Clients + 20% Packages + 10% Pace) scales as high as actual over-achievement warrants instead of flattening out at a second ceiling.

## [8.6.2]

### Changed
- Performance score components (Sales, Clients, Packages, Pace) are no longer capped at 100 — they now run up to 200 (double the benchmark). With a hard 100 cap, most staff on a healthy team cleared the benchmark in most categories (the app's own tier system expects 100-111%+ team achievement most months) and collapsed into the same score regardless of how far above standard they actually were. Raising the ceiling to 200 keeps genuine over-achievers visibly ahead of people who just cleared the bar. `clampScore()` in `AnalyticsDashboardView.tsx` and the About tab's formula explanation updated to match; the score bars still render full-width (clipped) past 100%, but the numeric label now shows the true score.

## [8.6.1]

### Changed
- Client/Package benchmarks in the performance score are fixed constants again — `BENCHMARK_CLIENTS_PER_DAY` = 1 and `BENCHMARK_PACKAGES_PER_DAY` = 1.25 (`lib/config.ts`), replacing the per-period team-average derivation from 8.6.0. Sales/Pace scoring is unchanged.

## [8.6.0]

### Changed
- Bulk & Analytics is now the first/default tab instead of Individual.
- Client/Package benchmarks in the performance score are no longer fixed constants — they're now computed per period as the team's own average clients/day and packages/day across whatever sheets are in view. The fixed constants (1.5 clients/day, 1.0 packages/day) were too easy to clear, so once someone crossed them their score capped at 100 regardless of how they compared to teammates who did even better — a top seller could show 100 on Packages/Clients despite moving fewer than others. Deriving the benchmark from the team's actual data keeps "100 = met standard" meaningful without manual recalibration. Sales/Pace scoring (personal target vs team target ÷ headcount) is unchanged.
- Analytics history (badges, streaks, lifetime stats, rank history in `lib/analyticsUtils.ts`) is now keyed by employee code instead of staff name, via a new `getPersonId()` helper (`lib/excelUtils.ts`) — codes don't change when a name is corrected or updated between uploads, so history/badges no longer silently split into two people. The Analytics Dashboard's own in-view aggregation (`computePersonData` in `AnalyticsDashboardView.tsx`) uses the same identifier, so quarterly/yearly views also merge a person correctly across a mid-period name change. Existing history already saved under old name-based keys is left as-is (not migrated) — it simply won't merge with new code-keyed records for that person going forward. The UI always displays the human name; the code is never shown as the primary label.
- Settings tab's "Staff Center Allocation" list now shows the staff member's name (resolved from whatever workbook was last uploaded in Bulk & Analytics) as the primary label, with the employee code shown as a smaller editable field below it — the code remains the actual stored/unique identifier for the mapping. Before any upload, the raw code is shown (as before).
- Rewrote the About tab's performance-score section to describe the current standards-based formula (Sales/Clients/Packages/Pace) — it still described the old percentile-based formula (v7.2.0) removed in 8.5.0.

### Added
- Staff names now show a small "C"/"I"/"D" center tag (resolved from Staff Center Allocation) next to their name in Bulk Results' table, and throughout the Analytics Dashboard (dropdowns, individual view, leaderboards).

### Removed
- "Made with ❤️ for sales teams everywhere" footer line on the About tab.

## [8.5.0]

### Changed
- Analytics performance score is now standards-based instead of percentile/rank-based: each component scores against a fixed benchmark (100 = met the benchmark exactly), so a score means the same thing across different months and team compositions instead of only measuring who beat whom. Components: Sales 50% (sales vs personal share of team target), Clients 20% (avg clients/day vs `BENCHMARK_CLIENTS_PER_DAY`), Packages 20% (avg packages/day vs `BENCHMARK_PACKAGES_PER_DAY`), Pace 10% (actual daily sales rate vs expected rate). Replaces the old Sales 50% / Productivity 25% / Efficiency 25% percentile formula. New benchmarks and weights live in `lib/config.ts` (`BENCHMARK_CLIENTS_PER_DAY`, `BENCHMARK_PACKAGES_PER_DAY`, `BENCHMARK_WORKING_DAYS`, `SCORE_WEIGHTS`). A neutral score of 50 is applied for Clients when no client data exists for a person (older sheet format), so they're neither rewarded nor penalised.

## [8.4.0]

### Added
- Settings tab has a new "Staff Center Allocation" section to add/edit/remove employee-code-to-center mappings, with Save, Reset to Defaults, and a one-step undo after reset — mirrors the existing Tier Configuration UX. Overrides persist to `localStorage` and take effect immediately in Bulk Results' Center-wise Stats, without touching `lib/config.ts`.
- `STAFF_CENTERS` in `lib/config.ts` seeded with the real staff roster's corrected center allocation (a few people cross centers regardless of their employee-code prefix) as the shipped default.

## [8.3.0]

### Fixed
- Analytics performance score (`performanceScore`/`efficiencyScore`) came out as `NaN` for every person whenever nobody in the selected period had client data — the "no client data" fallback checked `efficiencyRank > 0`, which is always true, instead of checking whether an efficiency ranking actually existed. Surfaced while testing the new leaderboard movement indicator below, which depends on this score being a real number.

### Added
- Bulk Results now calculates automatically on upload and whenever the month/period selectors change — no need to click "Calculate Team Incentives" first (the button still works for a manual re-trigger).
- Bulk upload auto-selects the current calendar month's sheet; if that sheet has no usable data (missing or empty), it falls back to the previous month.
- Bulk Results shows a new "Center-wise Stats" section below the Tier Ladder: total sales, packages, clients, and revenue % per center. Centers and their staff mapping are configured via `CENTERS`/`STAFF_CENTERS` in `lib/config.ts`.
- Analytics leaderboards now show each person's month-on-month performance-score movement (↑/↓/→ with a `+N pts`/`-N pts` delta) next to their name, when viewing a single month with a prior month's sheet available.

### Changed
- Settings tab's "Current Tier System" panel is now expanded by default instead of collapsed.

### Removed
- `CLAUDE.md` is no longer tracked in git (added to `.gitignore`); it stays on disk locally as internal guidance for Claude Code.

## [8.2.0]

### Added
- Individual tab now gives live feedback: team achievement, tier, and pool breakdown recalculate automatically (debounced) as you type, instead of only on clicking "Calculate".
- Individual tab inputs (target, sales, staff count, P1/P2 split) persist to `sessionStorage` so switching tabs and coming back no longer blanks the form.
- Settings tab shows a "Last saved" timestamp for tier configuration, and offers a one-step "Restore previous tiers" undo after "Reset to Defaults".

### Fixed
- `getTier()` defaulted to the hardcoded `DEFAULT_TIERS` when called without an explicit tiers argument (as `BulkResultsView`'s tier-ladder calculation does), ignoring the user's saved tier configuration. Now defaults to `loadTiers()`.
- Individual Tab's staff count placeholder was hardcoded to `"29"` instead of reading `DEFAULT_STAFF_COUNT` from `lib/config.ts`.

### Changed
- Settings tab's "Current Tier System" preview no longer shows the raw hex color code under each tier card.

## [8.1.1]

### Fixed
- Month sheets and the `getAvailableMonths()` helper now sort chronologically (Jan → Dec, then by year) instead of alphabetically, so e.g. `["Apr 26", "Feb 26", "Jan 26"]` orders as Jan, Feb, Apr.
- A malformed/unexpected Excel file could throw during parsing and crash the whole app to a blank screen. The Bulk & Analytics tab is now wrapped in a React error boundary that shows a recoverable error message instead.
