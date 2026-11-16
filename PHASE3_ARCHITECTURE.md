# Phase 3 — TypeScript Architecture Refactor

## Increment 1: v13.1.0 (implemented)

The first increment separates orchestration and financial logic from presentation without changing the established P1/P2 and Accounting Remainder policy.

### Boundaries

- `lib/excelUtils.ts`: workbook parsing, attendance cutoff and source staff data (unchanged).
- `lib/teamIncentives.ts`: source of truth for raw P1/P2 entitlement and independent whole-fils rounding (unchanged).
- `lib/bulkCalculation.ts`: **pure** period selection, aggregation, target validation, staff exclusions, official payout calculation, auditing, metric derivation, ranking baseline and typed `BulkCalculatedData` / `BulkResult`.
- `lib/bulkCsv.ts`: **pure** CSV composition, export-time payout reconciliation, accounting summary and formula-injection protection.
- `lib/pdfUtils.ts`: PDF rendering with typed `BulkCalculatedData` and `BulkResult` inputs (unchanged monetary values).
- `components/tabs/BulkResultsView.tsx`: React inputs, state, local storage, interactions and presentation only.

### Regression criteria

The Phase 2 golden spreadsheet tests and Playwright E2E suite must remain green. New `tests/bulkArchitecture.test.ts` independently exercises period selection, exclusions, manual target and zero-pool behavior, signed accounting reconciliation and CSV sanitization.

### Incremental next steps

1. Split `lib/excelUtils.ts` workbook reader, sheet parsing, and attendance rules without changing existing blank/NA semantics.
2. Introduce stronger typed results in PDF generation and eliminate remaining `any` (PDF library's internal private metadata may still need a narrow adapter).
3. Enable `strict` and `noUncheckedIndexedAccess` incrementally on domain modules, then React components after the migration passes.
4. Extract remaining KPI projections and presentation models from the large Bulk UI component.
5. Confirm financial sign-off with anonymized real workbook and independently expected incentives. The workbook's all-blank final-day reporting cutoff remains a known unresolved source ambiguity.

**Do not** alter incentive formulas, rounding, employee attendance semantics or the accounting-held residual-fils policy during refactoring.
