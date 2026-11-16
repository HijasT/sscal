# Phase 1 accuracy verification — v12.11.0

## Verification and owner-approved accounting remainder

GitHub Actions runs test, type-check and production build on every main-branch push and pull request. Synthetic SheetJS workbook tests cover blank attendance, NA, zero, errors and reporting cutoffs.

As of v12.11.0 the user requested **no largest-remainder distribution**. Raw staff P1 and P2 are rounded independently; the signed difference between the rounded incentive pool and their sum is reported as Accounting Remainder, not assigned to any employee. Positive and negative differences both require Accounting review. Regression tests cover both directions as well as a zero difference, excluded staff, roster ordering, and report formatting.

## Remaining real-world evidence

- An anonymized office Sales Tracker and independently verified expected sales, working days and payouts must be compared against the complete workbook parser.
- When every staff sales cell on a late reporting day is blank, the parser cannot infer that the day was reported. It conservatively stops at the last explicit numeric sales entry. This requires a clear reporting cutoff or an approved fallback rule.
- Confirm the production tier configuration and applicable employee population.
