import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultInsightsMonth, insightMonths, monthlyStaff, monthlyIncentives } from '../lib/insightMonthSelection.ts'
import { comparePersonalSplit } from '../lib/bulkInsights.ts'
import type { ExcelData, StaffData } from '../lib/excelUtils.ts'

const staff: StaffData[] = [
  { name: 'A', sales: 300, packages: 3, workingDays: 4, clients: 2 },
  { name: 'B', sales: 100, packages: 1, workingDays: 2, clients: 1 },
]
const sheet = (sheetName: string, target = 400): ExcelData => ({
  sheetName,
  staff,
  target,
  teamTotal: { sales: 400, packages: 4 },
})

test('insights month pickers discover and chronologically sort uploaded months', () => {
  const months = insightMonths([
    sheet('Nov 26'), sheet('Jan 27'), sheet('Dec26'),
    sheet('Feb 2026'), sheet('Aggregated'),
  ])
  assert.deepEqual(months.map(m => m.key), [
    'Feb 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027',
  ])
  assert.equal(months[1].sheet.sheetName, 'Nov 26')
})

test('monthly selections operate on the chosen worksheet and apply exclusions', () => {
  const rows = monthlyStaff(sheet('Sep 26'), new Set(['B']))
  assert.deepEqual(rows.map(p => p.name), ['A'])
  assert.equal(rows[0].sales, 300)
})

test('monthly 100% personal split compares with same pool, with green and red deltas', () => {
  const snapshot = monthlyIncentives(sheet('Nov 26'), new Set(), 50)
  assert.ok(snapshot)
  assert.equal(snapshot.sales, 400)
  assert.equal(snapshot.target, 400)
  assert.equal(snapshot.pool, 10)
  assert.deepEqual(snapshot.staff.map(p => p.totalIncentive), [6.25, 3.75])
  const rows = comparePersonalSplit(snapshot.staff, snapshot.sales, snapshot.pool)
  assert.deepEqual(rows.map(p => [p.personalOnly, p.delta]), [
    [7.5, 1.25], [2.5, -1.25],
  ])
  assert.equal(rows.reduce((n, p) => n + p.delta, 0), 0)
})

test('selected month uses its target, while explicit current-month override can change it', () => {
  const sheetData = sheet('Oct 26')
  assert.equal(monthlyIncentives(sheetData, new Set(), 50)?.pool, 10)
  assert.equal(monthlyIncentives(sheetData, new Set(), 50, 800)?.pool, 0)
  assert.equal(monthlyIncentives(sheetData, new Set(['B']), 50)?.sales, 300)
  assert.equal(monthlyIncentives(sheetData, new Set(['B']), 50)?.pool, 0)
})

test('missing targets return no comparison rather than fabricated incentives', () => {
  assert.equal(monthlyIncentives(sheet('Nov 26', 0), new Set(), 50), null)
  assert.equal(monthlyIncentives(sheet('Nov 26'), new Set(['A','B']), 50), null)
})

test('one global Insights picker defaults to calendar month; otherwise latest available', () => {
  const months = insightMonths([sheet('Oct 26'), sheet('Nov 26'), sheet('Dec 26')])
  assert.equal(defaultInsightsMonth(months, new Date(2026, 10, 13)), 'Nov 2026')
  assert.equal(defaultInsightsMonth(months, new Date(2027, 0, 2)), 'Dec 2026')
  assert.equal(defaultInsightsMonth([], new Date(2026, 10, 13)), '')
})
