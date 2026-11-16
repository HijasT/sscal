/** Accounting audit attachment. Generated locally; never uploads staff data. */
import type { BulkCalculatedData, BulkResult } from './bulkCalculation'
import { buildBulkCSV } from './bulkCsv'
import { APP_VERSION } from './config'

function csv(value: string | number): string {
  const text = String(value)
  const escaped = /^[=+\-@\t\r]/.test(text) ? "'" + text : text
  return '"' + escaped.replace(/"/g, '""') + '"'
}

export function buildBulkAuditCSV(
  results: readonly BulkResult[],
  data: BulkCalculatedData,
  excludedNames: readonly string[],
  generatedAt: string,
): string {
  // Reuse the reconciled canonical CSV report: monetary audit happens before export.
  const report = buildBulkCSV(results, data)
  if (!/^\d{4}-\d\d-\d\dT/.test(generatedAt)) throw new Error('Invalid audit timestamp')
  const fields: [string, string | number][] = [
    ['Application Version', APP_VERSION],
    ['Generated At (UTC)', generatedAt],
    ['Reporting Mode', data.viewMode],
    ['Source Sheets', data.sheets.join(' | ')],
    ['Team Target (AED)', data.target.toFixed(2)],
    ['Team Sales (AED)', data.teamSales.toFixed(2)],
    ['Team Achievement (%)', data.teamAchievement.toFixed(4)],
    ['Tier', data.tier.name],
    ['Tier Rate (%)', data.tier.rate],
    ['P1 Split (%)', data.p1Split],
    ['Payout Policy', data.payoutPolicy],
    ['Included Staff', data.staffCount],
    ['Excluded Staff Count', data.excludedCount],
    ['Excluded Staff Names', [...excludedNames].sort().join(' | ')],
    ['Staff Payouts (fils)', data.staffTotalFils],
    ['Accounting Remainder (fils)', data.remainderFils],
    ['Accounting Decision', 'Pending manual Accounting decision if remainder is nonzero'],
  ]
  // Audit metadata precedes the original report; no recomputation or redistribution.
  return 'Audit Field,Value\n' +
    fields.map(([key, value]) => [csv(key), csv(value)].join(',')).join('\n') +
    '\n\n' + report
}
