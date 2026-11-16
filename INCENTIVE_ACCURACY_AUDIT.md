# Incentive accuracy audit — Phase 1

Status: implementation-level validation added in v12.10.3; independent payroll approval and end-to-end workbook verification remain outstanding.

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

## Rounding policy still awaiting approval

Existing calculation figures are computed in JavaScript floating point and formatted to two decimal places for display. **Do not silently introduce a per-person fils-allocation algorithm.** The sum of individually rounded display amounts can differ by a few fils from the separately rounded team pool. Before production payroll use, confirm whether payout amounts must be rounded individually to fils, whether ties use half-up/half-even, and where any residual fils should be assigned (e.g. deterministic largest-remainder allocation). Once approved, add exact-fil reconciliation tests.

## Remaining Phase 1 validation

- Test the changes against anonymized real workbook samples, including current and closed months, all-NA days, zero-sales attended days, broken formulas, exclusions and manual targets.
- Verify actual production tier configuration (which can be customized per browser).
- Execute `npm test`, `npx tsc --noEmit` and `npm run build` in a complete environment. The GitHub connector can change files but cannot execute these commands.
- Reconcile independently approved staff payout spreadsheets against app output before treating results as payroll-authoritative.
