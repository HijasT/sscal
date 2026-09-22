# Changelog

All notable changes to this project are documented in this file.

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
