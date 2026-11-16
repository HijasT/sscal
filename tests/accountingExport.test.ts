import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountingExportRows, accountingSummaryCSV } from '../lib/accountingExport.ts'

test('CSV and PDF share identical residual-fils accounting summary', () => {
  for (const remainderFils of [2, 0, -2]) {
    const data = { totalPool: 100, staffTotalFils: 10000 - remainderFils, remainderFils }
    const rows = accountingExportRows(data)
    assert.equal(rows.length, 4)
    assert.deepEqual(rows.slice(0,3).map(r=>r[0]), [
      'Total Incentive Pool (AED)',
      'Total Staff Payouts (AED)',
      'Accounting Remainder (AED)',
    ])
    assert.equal(rows[2][1], remainderFils < 0 ? '-0.02' : remainderFils > 0 ? '0.02' : '0.00')
    const csv = accountingSummaryCSV(data)
    assert.ok(csv.includes('"Accounting Remainder (AED)","' + rows[2][1] + '"'))
    assert.ok(csv.includes('"Accounting Status","' + rows[3][1] + '"'))
    assert.equal(csv.split('\n').filter(Boolean).length, 5)
  }
})

test('exports block inconsistent accounting summary', () => {
  assert.throws(() => accountingExportRows({totalPool: 100,staffTotalFils: 9999,remainderFils: 0}),/does not reconcile/)
})
