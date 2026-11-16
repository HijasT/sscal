# Phase 2 — Regression protection (Kleon v13)

## Test layers

1. **Unit (Node/TypeScript):** tier boundaries, arithmetic validation, all P1/P2 splits, exclusions, signed Accounting Remainder, workbook attendance semantics and projection guardrails.
2. **Golden workbook:** synthetic checked-in fixture in `tests/fixtures/phase2-golden.json`. Expected employee sales, attendance, P1/P2, team pools and signed remainder were specified independently and are never produced by the Kleon calculation code at test runtime. `goldenWorkbook.cjs` turns those records into a real XLSX binary for a SheetJS round-trip test.
3. **Chromium E2E:** browser uploads that same workbook, validates ranking and accounting cards, exports and parses the actual downloaded CSV and PDF, and checks staff exclusion recalculation. Tests use isolated browser contexts and never upload or transmit staff data.
4. **CI:** on main pushes and pull requests, run `npm test`, coverage summary, `npx tsc --noEmit`, production build, then browser tests. Artifacts from failed browser runs are retained.

## Running checks

- `npm ci && npm test`
- `npm run test:coverage`
- `npx tsc --noEmit && npm run build`
- For local browser tests, install pinned CI-only dev tooling `npm install --no-save --package-lock=false @playwright/test@1.56.1 pdfjs-dist@4.10.38`, run `npx playwright install chromium`, then `npm run test:e2e`. The browser runner starts a production Next.js server on port 3100, so build before launching it.

## What the goldens prove

The synthetic November and December workbooks independently specify expected output for a negative rounding remainder, one `NA` absence, reported blank cells as zero-sale attendance, explicit zero cells, and future blank days excluded. They cover a Tier 1 and Tier 3 period with fixed payouts in AED. Golden assertions cover monthly parsing, working days, sales, packages, raw P1/P2 and independently rounded staff totals.

## Known limitations / release policy

- **Real-world sign-off:** synthetic fixtures cannot certify real Sales Tracker accuracy. An anonymized real workbook plus separately approved employee payout figures are still required for financial sign-off.
- **Reporting cutoff:** if all employees' final dated sales cells are blank, the current parser cannot distinguish a completed zero-sale day from an unreported future day. A separate explicit reporting cutoff is needed before certifying this scenario.
- **Branch protection:** GitHub Actions checks are configured, but branch rules cannot be assumed from the presence of a workflow. In repository Settings → Rules → Rulesets (or Branches), protect `main`, require pull requests and require the exact passing check `Unit, XLSX, types, build and browser smoke`. Restrict bypass rights. Verify after the first green v13 workflow.
- Browser tests are CI-only dependencies; their versions are pinned in the workflow. Before moving to Phase 3, prefer migrating them into lockfile-managed `devDependencies` for reproducibility.
- The privacy requirement remains: never commit an actual customer/staff workbook or screenshots containing sensitive information as a test fixture.

## Acceptance criteria

All Node tests, coverage invocation, TypeScript, Next.js build, and Chromium E2E tests must pass. PDF text and CSV content must expose the signed Accounting Remainder and agree on staff payout totals. No changes to live tier formulas, attendance policy, or employee rounding are permitted during this phase.
