/** Shared Accounting Remainder summary for CSV and PDF exports. */
import { formatCurrency } from './utils'
import { accountingRemainder, toFils } from './filsReconciliation'

export interface AccountingExportSummary {
  totalPool: number
  staffTotalFils: number
  remainderFils: number
}

export function accountingExportRows(input: AccountingExportSummary): [string, string][] {
  const poolFils = toFils(input.totalPool)
  const { staffFils, remainderFils } = accountingRemainder(poolFils, [input.staffTotalFils])
  if (remainderFils !== input.remainderFils) {
    throw new Error('Accounting Remainder does not reconcile to the incentive pool')
  }
  return [
    ['Total Incentive Pool (AED)', formatCurrency(poolFils / 100)],
    ['Total Staff Payouts (AED)', formatCurrency(staffFils / 100)],
    ['Accounting Remainder (AED)', (remainderFils < 0 ? '-' : '') + formatCurrency(Math.abs(remainderFils) / 100)],
    ['Accounting Status', remainderFils > 0 ? 'Unallocated balance - pending Accounting review'
      : remainderFils < 0 ? 'Staff rounding exceeds pool - pending Accounting review'
        : 'No rounding difference'],
  ]
}

export function accountingSummaryCSV(input: AccountingExportSummary): string {
  return ['Summary,Amount', ...accountingExportRows(input).map(([label, amount]) =>
    `"${label.replace(/"/g, '""')}","${amount.replace(/"/g, '""')}"`
  )].join('\n') + '\n'
}
