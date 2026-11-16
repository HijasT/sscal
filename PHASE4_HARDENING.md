# Phase 4 — Production hardening (v14.0.0)

## Scope and release criteria

September 2026 real Sales Tracker reconciliation is explicitly deferred. Financial sign-off remains required before treating the output as an approved payout.

### Data integrity
- Reject duplicate employee names/codes, nonfinite and negative sales, and invalid attendance/client/package counts before payroll calculation.
- Workbook parsing warns about duplicate identities and requires staff to correct the source workbook.
- NA means absent; 0 means attended; blanks on reported days mean attended with zero sales. Unreported trailing blanks remain excluded.

### Accounting audit
- Download Audit CSV creates a local report with version, UTC timestamp, period, target, team sales, tier, P1 split, staff exclusions and signed remainder in fils.
- Canonical reconciled employee CSV is included in the audit file. No rounding residue is assigned to employees.
- CSV injection-sensitive metadata is escaped. This is a calculation snapshot, not tamper-evident source validation or accounting approval.

### Performance
- Ranking sorting is memoized to avoid unnecessary reruns on React state changes.
- A synthetic 750-person calculation smoke test detects extreme regressions with a generously allowed CI duration. It is not a performance SLA.

### Release verification
- Required CI runs unit/integration, strict typing, production build and Playwright browser tests, including audit CSV download.
- Existing incentive math and accounting remainder policy are unchanged.

### GitHub settings
- The active HT-Fort ruleset requires CI and pull requests and prohibits bypass.
- Optional strict up-to-date requirement is a separate GitHub setting; code in this PR does not turn it on.

## Deferred
- Real September approved-payroll reconciliation and external financial sign-off.
- Human review of malformed but parseable workbook contents.
- Benchmarking against representative anonymized production workbooks and cryptographic source attestations.
