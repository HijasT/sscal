import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectMonthlySales } from '../lib/salesProjection.ts'

const now = new Date(2026, 10, 12)

test('projects month-end sales and plots actual, forecast and 100% target', () => {
  const p = projectMonthlySales({
    sales: 300000, target: 500000, year: 2026, month: 11,
    lastReportedDay: 12, now,
  })
  assert.ok(p)
  assert.equal(p.currentPercent, 60)
  assert.equal(p.projectedPercent, 150)
  assert.equal(p.projectedSales, 750000)
  assert.equal(p.dailySales, 25000)
  assert.equal(p.targetDay, 20)
  assert.equal(p.scaleMax, 150)
})

test('respects the latest reported day instead of assuming today is complete', () => {
  const p = projectMonthlySales({
    sales: 200000, target: 500000, year: 2026, month: 11,
    lastReportedDay: 10, now,
  })
  assert.ok(p)
  assert.equal(p.cutoff, 10)
  assert.equal(p.dailySales, 20000)
  assert.equal(p.targetDay, 25)
})

test('does not forecast a historical month, future month, or unreported workbook', () => {
  const args = { sales: 200000, target: 500000, year: 2026, month: 11, now }
  assert.equal(projectMonthlySales({ ...args, year: 2025, lastReportedDay: 12 }), null)
  assert.equal(projectMonthlySales({ ...args, month: 12, lastReportedDay: 12 }), null)
  assert.equal(projectMonthlySales({ ...args }), null)
  assert.equal(projectMonthlySales({ ...args, lastReportedDay: 13 }), null)
})

test('does not invent a within-month target date when trajectory misses target', () => {
  const p = projectMonthlySales({
    sales: 50000, target: 500000, year: 2026, month: 11,
    lastReportedDay: 12, now,
  })
  assert.ok(p)
  assert.equal(p.targetDay, null)
  assert.equal(p.targetReached, false)
})

test('already achieved target and no sales are handled safely', () => {
  const reached = projectMonthlySales({
    sales: 550000, target: 500000, year: 2026, month: 11,
    lastReportedDay: 12, now,
  })
  assert.equal(reached?.targetReached, true)
  assert.equal(reached?.targetDay, null)
  const zero = projectMonthlySales({
    sales: 0, target: 500000, year: 2026, month: 11,
    lastReportedDay: 12, now,
  })
  assert.equal(zero?.dailySales, 0)
  assert.equal(zero?.targetDay, null)
})
