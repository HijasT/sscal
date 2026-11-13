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
  assert.equal(p.projectedPercent, 141.045)
  assert.equal(p.projectedSales, 705225)
  assert.equal(p.dailySales, 25000)
  assert.equal(p.targetDay, 21)
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
  assert.equal(p.targetDay, 27)
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

test('9.95% reduction applies to future sales only and preserves recorded sales', () => {
  const p = projectMonthlySales({
    sales: 300000, target: 500000, year: 2026, month: 11,
    lastReportedDay: 12, now,
  })
  assert.ok(p)
  assert.equal(p.currentPercent, 60)
  assert.equal(p.projectedSales, 300000 + (750000 - 300000) * (1 - .0995))
})

test('projection cannot dip below recorded sales late in the month', () => {
  const lastDay = projectMonthlySales({
    sales: 500000, target: 600000, year: 2026, month: 11,
    lastReportedDay: 30, now: new Date(2026,10,30),
  })
  assert.ok(lastDay)
  assert.equal(lastDay.projectedSales, 500000)
  assert.equal(lastDay.projectedPercent, 500000 / 600000 * 100)
  assert.equal(lastDay.targetDay, null)
})

test('one day left: adjusted forecast adds discounted future sales to full actual', () => {
  const p = projectMonthlySales({
    sales: 725000, target: 800000, year: 2026, month: 11,
    lastReportedDay: 29, now: new Date(2026, 10, 29),
  })
  assert.ok(p)
  assert.ok(p.projectedSales >= 725000)
  assert.ok(Math.abs(p.projectedSales - (725000 + 725000 / 29 * .9005)) < 1e-8)
  assert.equal(p.targetDay, null)
})

test('as recorded month closes, the projection converges to actual instead of a lowered final total', () => {
  for (const day of [1, 12, 28, 29, 30]) {
    const sales = 25000 * day
    const p = projectMonthlySales({
      sales, target: 800000, year: 2026, month: 11,
      lastReportedDay: day, now: new Date(2026, 10, day),
    })
    assert.ok(p)
    assert.ok(p.projectedSales >= sales)
    assert.ok(Math.abs(p.projectedSales - (sales + 25000 * (30-day) * .9005)) < 1e-8)
    if (day === 30) {
      assert.equal(p.projectedSales, sales)
      assert.equal(p.projectedPercent, p.currentPercent)
      assert.equal(p.targetDay, null)
    }
  }
})
