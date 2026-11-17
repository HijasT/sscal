# Mr. Krabs Engine — v15.0.0 foundation (NOT an approved payroll release)

## What is implemented
- Both potential policies consume one shared Sales Tracker workbook.
- Daily numeric sales amounts and simple additive formulas are inspected for exact AED 10,000 entries (full-price Dubai It). Direct AED 10,000 is one Dubai It package; other direct numeric amounts are normal sales. Formula references, multipliers, and nonreconciling totals still require explicit manual review.
- A review panel displays employee, day, cell address, original formula, cached sales value and issue. Users must enter and confirm the package count; the review is scoped to the parsed workbook, not silently reused for another upload.
- A separate monthly employee comparison shows confirmed Dubai It counts, the existing official Legacy calculation and a hypothetical Legacy + Bonus result (80% qualification rule, AED 500/package default).
- A manual Legacy/Mr. Krabs selector is above the Bulk ranking table, while Settings retains the adjustable Dubai It bonus. A fully verified monthly Mr. Krabs scenario switches the ranking P1/P2/total display; unresolved verification leaves the Legacy ranking clearly labelled. Legacy CSV/PDF exports are disabled while Mr. Krabs is selected, preventing mismatched payout exports. Original Legacy formulas and results are unchanged.
- The parser records the earliest explicitly entered sale/zero day. For potential new joiners, inspect the previous calendar month's employee roster by code and infer the first explicit zero/sale day. The app requires human confirmation of calendar eligibility days. If the previous month is absent, the app does not assume the staff member is new.
- Mr. Krabs provisional preview computes 80/90/100/110 tiers, eligible pool excluding full-price Dubai It, 50/50 shares, P2 based on all employee sales divided by all team sales, the 80%-gated bonus, and individual calendar eligibility factors.

## Confirmed redistribution and simulation boundaries
- The user confirmed a **single-pass** redistribution of calendar pro-rata deductions only among existing staff (present in the immediately preceding month's roster) who have at least one eligible calendar day. The deducted P1 share is redistributed equally to eligible staff; deducted P2 is redistributed in proportion to their gross sales, with the denominator recalculated among eligible recipients only. New joiners never receive the redistribution; their P1 and P2 stay pro-rated. This is performed exactly once without recursively redistributing the redistributed amounts. If no existing-staff recipient (or no existing-staff P2 sales denominator) exists, the amount stays in the accounting remainder.
- P1 and P2 are rounded independently in fils for each employee; any signed rounding or undistributed residual is retained for Accounting, never assigned as an extra employee bonus.
- The simulation **now calculates complete per-employee Mr. Krabs results**, including redistributed P1/P2 and the Dubai It bonus. **Official Mr. Krabs payroll export remains disabled** until management signs off on the user-selected redistribution method and historical reports are validated.
- No period-aggregated Mr. Krabs calculation for quarters / year: monthly incentive tiers and policy versions must be calculated separately and only then aggregated.
- Legacy + Bonus is a hypothetical simulation, NOT retrospective entitlement. Bonus rates other than AED 500 are simulations.
- September real payroll reconciliation remains pending.
- No adjustments to the official Legacy calculations, PDFs, CSV, or financial audit output.

## Important limitations
- An exact AED 10,000 amount is interpreted as Dubai It only because the user supplied that product-pricing convention. This is a heuristic; sales may be edited or stored without package-level formula data.
- An employee not in the prior month's roster may be transferred/missing rather than newly hired. Their first recorded sale/zero might not be their actual joining date; eligibility requires manual confirmation.
- October and November 2026 are present in the user's supplied November source workbook; at review time all current November employee codes were listed in October, so no new joiner was inferred for this test input. The workbook is not committed to GitHub.\n- The application runs calculations locally and does not upload payroll information.
