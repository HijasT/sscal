# Incentive accuracy audit — Phase 1

Status: implementation-level validation added in v12.10.3–12.10.4. v12.10.5 adds automated quality checks and synthetic XLSX integration fixtures. Independent real-workbook payroll validation and rounding policy approval remain outstanding.

## Current approved formula (unchanged for valid positive sales)

- Achievement = total active staff sales / team target × 100.
- Default tiers: 85%–<101% = 2.5%; 101%–<111% = 3%; ≥111% = 3.5%. Tiers remain configurable in Settings.
- Pool = team sales × tier rate / 100.
- P1 pool = pool × P1% / 100, shared equally among all active staff, including those with zero personal sales.
- P2 pool = the remaining pool, shared proportional to each active employee's sales.
- Employee incentive = P1 share + P2 share.
- Staff exclusions legitimately recalculate team sales, tiers and incentives; center visibility filters never do.
- Zero team sales means zero pool, zero contribution and zero payouts.
- Inputs must be finite; target > 0; team and personal sales ≥ 0; active staff count a positive integer; P1 in [0,100]; personal sales ≤ team sales.

## Workbook attendance semantics

- `NA` and `N/A` (case-insensitive): absent, **not** a worked day.
- Numeric `0` or text `0` in the sales cell: present, worked day, zero sales.
- Blank sales cell: zero sales and a worked day when its date is within the known reporting period.
- Future blank date: not yet recorded and not counted as worked. Reported-day cutoff is derived from explicit dated sales entries.
- Broken Excel formula: warning/invalid data, never a worked day.
- The one-day fallback for positive sales is used only if the worksheet has **no** daily columns.

## Safety checks

Bulk Calculator and monthly Beta comparisons now refuse to present a payout if an employee calculation fails or calculated staff payouts fail reconciliation. Reconciliation checks team sales, each employee's P1 + P2, the total pool and finite nonnegative values. Raw floating-point tolerance covers numerical representation only, not material discrepancies.

## Approved residual-fils policy (active in v12.10.7)

Official Bulk and monthly Beta actual incentives allocate the rounded team pool using the largest-remainder method. The team P1 pool is rounded to fils, P2 receives the remaining fils, and staff awards are allocated independently within each pool using raw entitlements as weights. Each row's final total is exactly its allocated P1 plus P2 in whole fils. Exact ties use employee code in lexicographic order, then a normalized name fallback for staff with no code; duplicate keys block allocation. CSV/PDF show these same awards.

The Individual Calculator has no team roster and therefore displays a clearly labeled *estimate*. Its exact official payout can differ by one or more fils because tie-breaks require every employee's raw entitlement. Use Bulk for final allocated staff amounts.

## Remaining Phase 1 validation

- Test the changes against anonymized real workbook samples, including current and closed months, all-NA days, zero-sales attended days, broken formulas, exclusions and manual targets.
- Verify actual production tier configuration (which can be customized per browser).
- GitHub Actions is configured in v12.10.5 to run `npm test`, `npx tsc --noEmit` and `npm run build`; check its actual run results rather than assuming configuration means success.
- Reconcile independently approved staff payout spreadsheets against app output before treating results as payroll-authoritative.
