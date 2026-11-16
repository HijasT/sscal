# Phase 1 accuracy verification — v12.10.6

## Verification added

- New GitHub Actions quality gate on every main push and pull request runs unit/integration tests, TypeScript check and production build.
- New SheetJS XLSX workbook fixtures cover blank attendance within reported dates, numeric zero, NA absence, errors, client-row layouts and future blanks.
- Workbook-to-incentive tests verify the team pool and P1/P2 reconciliation from parsed data.
- A proposal-only rounding preview with deterministic largest-remainder allocation has tests. Live payouts are not changed.

## Pending approval: distributing residual fils

Live P1/P2 payouts remain calculated without per-person rounding, then displayed with two decimals. Separately rounded displayed staff payouts can differ by a few fils from the rounded team incentive pool.

Proposed policy (NOT ACTIVE):
1. Compute each raw incentive and the total pool.
2. Round the total pool to fils.
3. Initially assign the floor of each raw individual payout in fils.
4. Distribute remaining fils by descending fractional remainder.
5. Resolve ties using a unique stable employee identifier (name is only a placeholder in the proposal).

This ensures the total of displayed allocations matches the separately rounded pool, but a person's payout may differ by a fils from independently rounding every employee. Requires explicit business-policy sign-off.

## Remaining real-world evidence

- An anonymized office Sales Tracker and independently verified expected sales, working days and payouts must be compared against the complete workbook parser.
- When every staff sales cell on a late reporting day is blank, the parser cannot infer that the day was reported. It conservatively stops at the last explicit numeric sales entry. This requires a clear reporting cutoff or an approved fallback rule.
- Confirm the production tier configuration and applicable employee population.
